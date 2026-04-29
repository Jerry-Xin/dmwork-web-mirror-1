import BigNumber from "bignumber.js";
import { Setting } from "wukongimjssdk";
import { WKSDK, ChannelInfo, Channel, Conversation, Message, MessageStatus, ChannelTypePerson, ChannelTypeGroup,ConversationExtra,Reminder, MessageExtra, Reply } from "wukongimjssdk";


/**
 * 将服务端 msg-level 外部来源字段从原始 JSON map 透传到目标对象上。
 * 覆盖字段：from_is_external / from_source_space_name / from_home_space_id /
 * from_home_space_name。消费方（MessageWrap getter）按 snake_case 属性读取。
 *
 * 用于所有「从服务端 JSON 反序列化得到 Message/Reply」的路径：
 *   - Convert.toMessage（conversation/sync 的 recents / message/channel/sync）
 *   - MergeforwardContent.mapToMessage（合并转发内嵌消息）
 *   - Reply.prototype.decode（引用消息预览，见 patchSdkDecodeForExternalFields）
 *   - 未来任何新的 decode 入口应同样调用此方法
 *
 * target 使用 any 以便同时兼容 SDK 的 Message 与 Reply 实例；两者都没有
 * 对应字段的声明，消费方统一通过 snake_case 属性读取。
 *
 * 硬约束：仅做字段拷贝；不修改 resolver 或渲染逻辑。
 */
export function applyMsgLevelExternalFields(target: any, msgMap: any): void {
    if (!target || !msgMap) return

    const fromIsExternal = msgMap["from_is_external"]
    if (fromIsExternal !== undefined && fromIsExternal !== null) {
        target.from_is_external = fromIsExternal === 1 ? 1 : 0
    }
    const fromSourceSpaceName = msgMap["from_source_space_name"]
    if (fromSourceSpaceName !== undefined && fromSourceSpaceName !== null) {
        target.from_source_space_name = fromSourceSpaceName
    }
    const fromHomeSpaceId = msgMap["from_home_space_id"]
    if (fromHomeSpaceId !== undefined && fromHomeSpaceId !== null) {
        target.from_home_space_id = fromHomeSpaceId
    }
    const fromHomeSpaceName = msgMap["from_home_space_name"]
    if (fromHomeSpaceName !== undefined && fromHomeSpaceName !== null) {
        target.from_home_space_name = fromHomeSpaceName
    }
}

/**
 * dmwork-web#1069 round 4：
 * 通过 WebSocket 推送（含 Message 构造 / Message.fromSendPacket）投递的消息，
 * 二进制 wire protocol 不携带 msg-level 外部来源字段——SendPacket / RecvPacket
 * 仅含 payload / channelID / fromUID / ... 没有 from_home_space_* 或 from_is_external。
 * 对这条路径仅靠原地字段拷贝不够，需要以 fromUID 反查 channelInfo.orgData
 * 兜底出 home_space_id / home_space_name。
 *
 * 调用顺序保证字段优先级：
 *   wire/REST 自带字段（msgMap）> channelInfo.orgData 兜底
 * 已有值绝不覆盖。
 *
 * 硬约束：只读 channelInfo（同步 getChannelInfo，不触发网络请求），
 * 失败（未缓存 / 异常）静默放过——此处回落与 MessageWrap 原有 orgRes 兜底对齐。
 */
export function applyMsgLevelExternalFieldsWithFallback(target: any, msgMap: any): void {
    applyMsgLevelExternalFields(target, msgMap)

    if (!target) return
    // 优先使用现场 JSON 携带的值；缺则走 channelInfo.orgData 兜底
    const needHomeSpaceId = target.from_home_space_id === undefined || target.from_home_space_id === null || target.from_home_space_id === ""
    const needHomeSpaceName = target.from_home_space_name === undefined || target.from_home_space_name === null || target.from_home_space_name === ""
    if (!needHomeSpaceId && !needHomeSpaceName) return

    const fromUID: string | undefined = target.fromUID || (msgMap && msgMap.fromUID) || (msgMap && msgMap["from_uid"])
    if (!fromUID) return

    try {
        const info = WKSDK.shared().channelManager.getChannelInfo(new Channel(fromUID, ChannelTypePerson))
        const org = info?.orgData
        if (!org) return
        if (needHomeSpaceId) {
            const hsId = org.home_space_id
            if (typeof hsId === "string" && hsId.length > 0) {
                target.from_home_space_id = hsId
            }
        }
        if (needHomeSpaceName) {
            const hsName = org.home_space_name
            if (typeof hsName === "string" && hsName.length > 0) {
                target.from_home_space_name = hsName
            }
        }
    } catch (_e) {
        // channelManager 未初始化或查询失败：静默兜底失败，上层保留既有字段
    }
}

let sdkDecodePatched = false

/**
 * Monkey-patch WKSDK 内部的 decode / 构造路径，确保 msg-level 外部来源字段在
 * 所有 Message 入口上都被透传或通过 channelInfo 兜底补齐。覆盖：
 *   - Reply.prototype.decode：引用消息预览（PR#1073, round 2）。
 *   - Message.fromSendPacket：当前用户发送 / send-ack 回放的 Message（round 4）。
 *     SendPacket 二进制 wire 不含 from_home_space_*，透传之后用 channelInfo 兜底。
 *   - ChatManager.prototype.notifyMessageListeners：WebSocket 推送路径
 *     `new Message(recvPacket)` 无法在构造处挂钩，改为在派发给 listener 前
 *     以 fromUID 从 channelInfo.orgData 兜底补齐 home_space_id / home_space_name。
 *
 * PR#1071 已在 Convert.toMessage / MergeforwardContent.mapToMessage 两条入口
 * 通过 applyMsgLevelExternalFields 补齐字段；本 patch 覆盖剩余 3 条 SDK 内部入口，
 * 避免 WebSocket 推送 / send-ack 回放 / 引用消息预览的 Message 对象丢字段。
 *
 * 幂等：多次调用只 patch 一次。
 * 硬约束：仅追加字段拷贝，不改变原 decode / 构造 / 通知语义；失败静默放过。
 *
 * 参见 dmwork-web#1069 round 2 / 4。
 */
export function patchSdkDecodeForExternalFields(): void {
    if (sdkDecodePatched) return
    sdkDecodePatched = true

    const originalReplyDecode = Reply.prototype.decode
    Reply.prototype.decode = function (data: any) {
        originalReplyDecode.call(this, data)
        applyMsgLevelExternalFields(this, data)
    }

    // Message.fromSendPacket：当前用户发送的消息 / send-ack 回放。SendPacket 二进制
    // wire 不含 from_home_space_*，但发送者 == 当前用户，channelInfo 理应已缓存
    // 自身的 home_space_id / home_space_name；以 fallback 补齐，保持 UI 一致。
    const MessageCtor = Message as any
    const originalFromSendPacket = MessageCtor.fromSendPacket
    if (typeof originalFromSendPacket === "function") {
        MessageCtor.fromSendPacket = function (sendPacket: any, content?: any): Message {
            const msg: any = originalFromSendPacket.call(MessageCtor, sendPacket, content)
            applyMsgLevelExternalFieldsWithFallback(msg, sendPacket)
            return msg
        }
    }

    // ChatManager.prototype.notifyMessageListeners：WebSocket 推送路径（`new Message(recvPacket)`）
    // 无法在 SDK 内部构造函数处挂钩——直接 patch class 构造器会破坏 instanceof。
    // 改为在派发给业务 listener 前对消息应用 channelInfo 兜底。
    try {
        const chatManager: any = WKSDK.shared().chatManager
        const ChatManagerProto: any = chatManager && Object.getPrototypeOf(chatManager)
        if (ChatManagerProto && typeof ChatManagerProto.notifyMessageListeners === "function") {
            const originalNotify = ChatManagerProto.notifyMessageListeners
            ChatManagerProto.notifyMessageListeners = function (message: any): void {
                // 仅补 home_space_* 兜底；is_external / source_space_name 老路径不在 wire 层出现
                applyMsgLevelExternalFieldsWithFallback(message, undefined)
                return originalNotify.call(this, message)
            }
        }
    } catch (_e) {
        // 没拿到 ChatManager 单例（init 顺序异常）时静默：Convert.toMessage 仍是主路径。
    }
}

export class Convert {
    static toConversation(conversationMap: any): Conversation {
        const conversation = new Conversation()
        conversation.channel = new Channel(conversationMap['channel_id'], conversationMap['channel_type'])
        conversation.unread = conversationMap['unread'] || 0;
        conversation.timestamp = conversationMap['timestamp'] || 0;

        let recents = conversationMap["recents"];
        if (recents && recents.length > 0) {
            const messageModel = this.toMessage(recents[0]);
            conversation.lastMessage = messageModel
        }
        conversation.extra = {}
        conversation.extra.top = conversationMap["stick"]
        conversation.extra.categoryId = conversationMap["category_id"] ?? null
        conversation.extra.categorySort = conversationMap["category_sort"] ?? 0
        // 后端返回的 per-Space 字段
        if (conversationMap["space_unread"] !== undefined && conversationMap["space_unread"] !== null) {
            conversation.extra.spaceUnread = conversationMap["space_unread"]
        }
        if (conversationMap["space_last_message"]) {
            conversation.extra.spaceLastMessage = this.toMessage(conversationMap["space_last_message"])
        }
        if(conversationMap["extra"]) {
            conversation.remoteExtra = this.toConversationExtra(conversation.channel,conversationMap["extra"])
        }

        return conversation
    }

    static toReminder(reminderMap:any) :Reminder {
        const reminder = new Reminder()
        reminder.channel =  new Channel(reminderMap['channel_id'], reminderMap['channel_type'])
        reminder.messageID = reminderMap["message_id"]
        reminder.messageSeq = reminderMap["message_seq"]
        reminder.reminderID = reminderMap["id"]
        reminder.reminderType = reminderMap["reminder_type"]
        reminder.text = reminderMap["text"]
        reminder.data = reminderMap["data"]
        reminder.isLocate = reminderMap["is_locate"] === 1
        reminder.version = reminderMap["version"]
        reminder.done = reminderMap["done"] === 1
        return reminder
    }

    static toConversationExtra(channel:Channel,conversationExtraMap:any) :ConversationExtra {
        const conversationExtra = new ConversationExtra()
        conversationExtra.channel = channel
        conversationExtra.browseTo = conversationExtraMap["browse_to"]
        conversationExtra.keepMessageSeq = conversationExtraMap["keep_message_seq"]
        conversationExtra.keepOffsetY = conversationExtraMap["keep_offset_y"]
        conversationExtra.draft = conversationExtraMap["draft"]||""
        conversationExtra.version = conversationExtraMap["version"] 
        return conversationExtra
    }

    static toMessage(msgMap: any): Message {
        const message = new Message();
        if (msgMap['message_idstr']) {
            message.messageID = msgMap['message_idstr'];
        } else {
            message.messageID = new BigNumber(msgMap['message_id']).toString();
        }
        if (msgMap["header"]) {
            message.header.reddot = msgMap["header"]["red_dot"] === 1 ? true : false
        }
        if (msgMap["setting"]) {
            message.setting = Setting.fromUint8(msgMap["setting"])
        }
        if (msgMap["revoke"]) {
            message.remoteExtra.revoke = msgMap["revoke"] === 1 ? true : false
        }
        if(msgMap["message_extra"]) {
            const messageExtra = msgMap["message_extra"]
           message.remoteExtra = this.toMessageExtra(messageExtra)
        }
        
        message.clientSeq = msgMap["client_seq"]
        message.channel = new Channel(msgMap['channel_id'], msgMap['channel_type']);
        message.messageSeq = msgMap["message_seq"]
        message.clientMsgNo = msgMap["client_msg_no"]
        message.fromUID = msgMap["from_uid"]
        message.timestamp = msgMap["timestamp"]
        message.status = MessageStatus.Normal
        const contentObj = msgMap["payload"]
        let contentType = 0
        if (contentObj) {
            contentType = contentObj.type
        }
        const messageContent = WKSDK.shared().getMessageContent(contentType)
        if (contentObj) {
            messageContent.decode(this.stringToUint8Array(JSON.stringify(contentObj)))
        }
        message.content = messageContent

        message.isDeleted = msgMap["is_deleted"] === 1

        // 外部群成员消息来源字段（YUJ-50 / YUJ-53 / YUJ-64 / dmwork-web#1069）：
        // /message/channel/sync 和 conversation/sync 响应在 msg-level 携带
        // from_is_external / from_source_space_name / from_home_space_id /
        // from_home_space_name。统一通过 applyMsgLevelExternalFields 透传，
        // 保证所有 decode 入口行为一致。
        applyMsgLevelExternalFields(message, msgMap)

        return message
    }

    static toMessageExtra(msgExtraMap: any) :MessageExtra {
        const messageExtra = new MessageExtra()
        if (msgExtraMap['message_id_str']) {
            messageExtra.messageID = msgExtraMap['message_id_str'];
        } else {
            messageExtra.messageID = new BigNumber(msgExtraMap['message_id']).toString();
        }
        messageExtra.messageSeq = msgExtraMap["message_seq"]
        messageExtra.readed = msgExtraMap["readed"] === 1
        if(msgExtraMap["readed_at"] && msgExtraMap["readed_at"]>0) {
            messageExtra.readedAt = new Date(msgExtraMap["readed_at"] )
        }
        messageExtra.revoke = msgExtraMap["revoke"] === 1
        if(msgExtraMap["revoker"]) {
            messageExtra.revoker = msgExtraMap["revoker"]
        }
        messageExtra.readedCount = msgExtraMap["readed_count"] || 0
        messageExtra.unreadCount = msgExtraMap["unread_count"] || 0
        messageExtra.extraVersion = msgExtraMap["extra_version"] || 0
        messageExtra.editedAt = msgExtraMap["edited_at"] || 0

        const contentEditObj = msgExtraMap["content_edit"]
        if(contentEditObj) {
            const contentEditContentType = contentEditObj.type
            const contentEditContent = WKSDK.shared().getMessageContent(contentEditContentType)
            const contentEditPayloadData = this.stringToUint8Array(JSON.stringify(contentEditObj))
            contentEditContent.decode(contentEditPayloadData)
            messageExtra.contentEditData = contentEditPayloadData
            messageExtra.contentEdit = contentEditContent

            messageExtra.isEdit = true
        }

        return messageExtra
    }
   

    static userToChannelInfo(data: any): ChannelInfo {
        let channelInfo = new ChannelInfo()
        channelInfo.channel = new Channel(data.uid, ChannelTypePerson);
        channelInfo.title = data.name;
        channelInfo.mute = data.mute === 1;
        channelInfo.top = data.top === 1;
        channelInfo.online = data.online === 1;
        channelInfo.lastOffline = data.last_offline

        channelInfo.orgData = data.extra || {};
        channelInfo.orgData = { ...channelInfo.orgData, ...data }
        channelInfo.orgData.remark = data.remark ?? "";
        channelInfo.orgData.displayName = data.remark && data.remark !== "" ? data.remark : channelInfo.title;
        channelInfo.orgData.shortNo = data.short_no ?? ""

        channelInfo.logo = data.logo
        if (!channelInfo.logo || channelInfo.logo === "") {
            channelInfo.logo = `users/${data.uid}/avatar`
        }

        if (data.category === "system" || data.category === "customerService") { // 官方账号
            channelInfo.orgData.identityIcon = "./identity_icon/official.png"
            channelInfo.orgData.identitySize = { width: "18px", height: "18px" }
        } else if (data.category === "visitor") {
            channelInfo.orgData.identityIcon = "./identity_icon/visitor.png"
            channelInfo.orgData.identitySize = { width: "48px", height: "24px" }
        }

        return channelInfo
    }

    static groupToChannelInfo(data: any): ChannelInfo {
        let channelInfo = new ChannelInfo()
        channelInfo.channel = new Channel(data.group_no, ChannelTypeGroup);
        channelInfo.title = data.name;
        channelInfo.mute = data.mute === 1;
        channelInfo.top = data.top === 1;
        channelInfo.online = data.online === 1;
        channelInfo.lastOffline = data.last_offline

        channelInfo.orgData = data.extra || {};
        channelInfo.orgData = { ...channelInfo.orgData, ...data }
        channelInfo.orgData.remark = data.remark ?? "";
        channelInfo.orgData.displayName = data.remark && data.remark !== "" ? data.remark : channelInfo.title;
        channelInfo.orgData.forbidden = data.forbidden;
        channelInfo.orgData.invite = data.invite;
        channelInfo.orgData.forbiddenAddFriend = data.forbidden_add_friend;
        channelInfo.orgData.save = data.save;

        channelInfo.logo = data.logo
        if (!channelInfo.logo || channelInfo.logo === "") {
            channelInfo.logo = `groups/${data.group_no}/avatar`
        }
        return channelInfo
    }

    static stringToUint8Array(str: string): Uint8Array {
        return new TextEncoder().encode(str)
    }
}