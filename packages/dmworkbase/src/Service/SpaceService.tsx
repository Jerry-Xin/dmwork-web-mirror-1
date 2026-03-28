import WKApp from "../App"
import { ChannelTypePerson, ChannelTypeGroup, Channel, Conversation, Message } from "wukongimjssdk"
import { hasSpacePrefix } from "./SpacePrefix"

export { hasSpacePrefix } from "./SpacePrefix"

// 系统 Bot channelID 集合
const SYSTEM_BOTS = new Set(["botfather"])

/**
 * 为系统 Bot（如 BotFather）的会话列表预览做 Space 过滤。
 * - 不在 Space 模式 → 返回原始 lastMessage
 * - channel 不是系统 Bot → 返回原始 lastMessage
 * - lastMessage.content.contentObj.space_id 匹配当前 Space → 返回原消息
 * - 不匹配或无 space_id → 返回 undefined（不泄漏其他 Space 内容）
 */
export function getSpaceFilteredLastMessage(conversation: Conversation): Message | undefined {
    const currentSpaceId = WKApp.shared.currentSpaceId
    if (!currentSpaceId) return conversation.lastMessage

    if (conversation.channel.channelType !== ChannelTypePerson) return conversation.lastMessage
    if (!SYSTEM_BOTS.has(conversation.channel.channelID)) return conversation.lastMessage

    const lastMsg = conversation.lastMessage
    if (!lastMsg) return undefined

    const spaceId = lastMsg.content?.contentObj?.space_id
    if (spaceId && spaceId === currentSpaceId) return lastMsg
    // 无 space_id 或不匹配 → 不展示（与 iOS spaceFilteredLastMessage 行为一致）
    return undefined
}

/**
 * 判断一个 channel 是否不属于当前 Space，应从展示/计数中跳过。
 * - 无 currentSpaceId → 不过滤
 * - Person channel（私聊）→ 永远不过滤
 * - 有 Space 前缀（s{spaceId}_）的 channel → 前缀匹配
 * - 群聊（无前缀）→ 查 channelSpaceMap 缓存
 * - 缓存未命中 → fail-close（不放行）
 */
export function shouldSkipChannelForSpace(channel: Channel): boolean {
    const currentSpaceId = WKApp.shared.currentSpaceId
    if (!currentSpaceId) return false
    if (!channel?.channelID) return false

    const cid = channel.channelID

    // 有 Space 前缀的 channel（私聊 s{spaceId}_{uid} 或群聊 s{spaceId}_{groupNo}）
    if (hasSpacePrefix(cid)) {
        return !cid.startsWith(`s${currentSpaceId}_`)
    }

    // 无前缀的私聊 → 不过滤（旧数据兼容）
    if (channel.channelType === ChannelTypePerson) return false

    // 无前缀的群聊 → 查 channelSpaceMap 缓存
    if (channel.channelType === ChannelTypeGroup) {
        const key = `${cid}_${channel.channelType}`
        const cachedSpaceId = WKApp.shared.channelSpaceMap.get(key)
        if (cachedSpaceId) {
            return cachedSpaceId !== currentSpaceId // 匹配 → 放行，不匹配 → 跳过
        }
        return true // 缓存未命中 → fail-close，不放行
    }

    return false
}

/**
 * 判断一条消息是否不属于当前 Space（用于通知/提示音过滤）。
 * 对普通 channel 退化为 shouldSkipChannelForSpace。
 * 对系统 Bot 消息，额外检查 message.content.contentObj.space_id。
 */
export function shouldSkipMessageForSpace(message: Message): boolean {
    // 先检查 channel 级过滤
    if (shouldSkipChannelForSpace(message.channel)) return true

    // 系统 Bot 额外检查消息级 space_id
    const currentSpaceId = WKApp.shared.currentSpaceId
    if (!currentSpaceId) return false
    if (message.channel.channelType !== ChannelTypePerson) return false
    if (!SYSTEM_BOTS.has(message.channel.channelID)) return false

    const msgSpaceId = message.content?.contentObj?.space_id
    // 有 space_id 且不匹配 → 跳过
    if (msgSpaceId && msgSpaceId !== currentSpaceId) return true
    // 无 space_id → 跳过（BotFather 旧消息不应触发通知）
    if (!msgSpaceId) return true

    return false
}

export interface Space {
    space_id: string
    name: string
    description: string
    logo: string
    member_count: number
    max_users: number // 0 means unlimited
    role: number // 1: owner, 2: admin, 3: member
    created_at: string
}

export interface SpaceMember {
    uid: string
    name: string
    avatar: string
    role: number // 1: owner, 2: admin, 3: member
    robot: number // 0: user, 1: bot
    created_at: string
}

export interface SpaceCreateResp {
    space_id: string
}

export interface InviteResp {
    invite_code: string
    invite_url: string
}

export class SpaceService {
    static shared = new SpaceService()

    async getMySpaces(): Promise<Space[]> {
        const resp = await WKApp.apiClient.get("space/my")
        return resp || []
    }

    async createSpace(name: string, description: string): Promise<SpaceCreateResp> {
        return WKApp.apiClient.post("space/create", { name, description })
    }

    async getSpace(spaceId: string): Promise<Space> {
        return WKApp.apiClient.get(`space/${spaceId}`)
    }

    async getMembers(spaceId: string, page: number = 1, limit: number = 50): Promise<SpaceMember[]> {
        const resp = await WKApp.apiClient.get(`space/${spaceId}/members?page=${page}&limit=${limit}`)
        return resp || []
    }

    async createInvite(spaceId: string): Promise<InviteResp> {
        return WKApp.apiClient.post(`space/${spaceId}/invite`, {})
    }

    async getInviteInfo(inviteCode: string): Promise<{
        invite_code: string;
        space_id: string;
        space_name: string;
        member_count: number;
        max_users: number;
    }> {
        return WKApp.apiClient.get(`space/invite/${inviteCode}`)
    }

    async joinSpace(inviteCode: string): Promise<void> {
        return WKApp.apiClient.post("space/join", { invite_code: inviteCode })
    }

    async leaveSpace(spaceId: string): Promise<void> {
        return WKApp.apiClient.post(`space/${spaceId}/leave`, {})
    }

    async updateSpace(spaceId: string, data: { name?: string; description?: string }): Promise<void> {
        return WKApp.apiClient.put(`space/${spaceId}`, data)
    }

    async removeMembers(spaceId: string, uids: string[]): Promise<void> {
        return WKApp.apiClient.delete(`space/${spaceId}/members`, { data: { uids } })
    }

    async disbandSpace(spaceId: string): Promise<void> {
        return WKApp.apiClient.delete(`space/${spaceId}`, {})
    }

    async updateMemberRole(spaceId: string, uid: string, role: number): Promise<void> {
        return WKApp.apiClient.put(`space/${spaceId}/members/${uid}/role`, { role })
    }
}
