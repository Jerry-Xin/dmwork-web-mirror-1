import { describe, it, expect, beforeAll, afterEach } from "vitest"
import {
    Reply,
    Message,
    WKSDK,
    Channel,
    ChannelTypePerson,
    ChannelInfo,
} from "wukongimjssdk"
import {
    applyMsgLevelExternalFields,
    applyMsgLevelExternalFieldsWithFallback,
    patchSdkDecodeForExternalFields,
} from "../Convert"

/**
 * dmwork-web#1069 round 2:
 *
 * WKSDK 的 Reply.prototype.decode 属于 SDK 内部 JSON 反序列化路径（bundle
 * 反编译证据指向此类），PR#1071 未覆盖。该 patch 幂等地为 Reply 的 decode
 * 追加 msg-level 外部来源字段透传，行为与 Convert.toMessage /
 * MergeforwardContent.mapToMessage 保持一致。
 */
describe("patchSdkDecodeForExternalFields — Reply.prototype.decode", () => {
    beforeAll(() => {
        // 幂等：重复调用仅生效一次
        patchSdkDecodeForExternalFields()
        patchSdkDecodeForExternalFields()
    })

    const baseReplyData = (overrides: Record<string, any> = {}) => ({
        message_id: "10",
        message_seq: 10,
        from_uid: "user-c",
        from_name: "Carol",
        root_message_id: "9",
        ...overrides,
    })

    it("preserves original decode semantics (fromUID / fromName / messageID)", () => {
        const reply = new Reply()
        reply.decode(baseReplyData())
        expect(reply.messageID).toBe("10")
        expect(reply.messageSeq).toBe(10)
        expect(reply.fromUID).toBe("user-c")
        expect(reply.fromName).toBe("Carol")
        expect(reply.rootMessageID).toBe("9")
    })

    it("stashes from_home_space_id / from_home_space_name on the Reply", () => {
        const reply: any = new Reply()
        reply.decode(baseReplyData({
            from_home_space_id: "space-ml",
            from_home_space_name: "MlampWork",
        }))
        expect(reply.from_home_space_id).toBe("space-ml")
        expect(reply.from_home_space_name).toBe("MlampWork")
    })

    it("stashes legacy from_is_external=1 / from_source_space_name as 0/1 flag", () => {
        const reply: any = new Reply()
        reply.decode(baseReplyData({
            from_is_external: 1,
            from_source_space_name: "MlampWork",
        }))
        expect(reply.from_is_external).toBe(1)
        expect(reply.from_source_space_name).toBe("MlampWork")
    })

    it("coerces from_is_external to strict 0 when not === 1", () => {
        const reply: any = new Reply()
        reply.decode(baseReplyData({ from_is_external: 0 }))
        expect(reply.from_is_external).toBe(0)
    })

    it("does not set external fields when absent (backward compatible)", () => {
        const reply: any = new Reply()
        reply.decode(baseReplyData())
        expect(reply.from_is_external).toBeUndefined()
        expect(reply.from_source_space_name).toBeUndefined()
        expect(reply.from_home_space_id).toBeUndefined()
        expect(reply.from_home_space_name).toBeUndefined()
    })
})

describe("applyMsgLevelExternalFields — works on arbitrary target (Message or Reply)", () => {
    it("copies fields onto a Reply instance", () => {
        const reply: any = new Reply()
        applyMsgLevelExternalFields(reply, {
            from_is_external: 1,
            from_source_space_name: "MlampWork",
            from_home_space_id: "space-ml",
            from_home_space_name: "MlampWork",
        })
        expect(reply.from_is_external).toBe(1)
        expect(reply.from_source_space_name).toBe("MlampWork")
        expect(reply.from_home_space_id).toBe("space-ml")
        expect(reply.from_home_space_name).toBe("MlampWork")
    })

    it("no-ops on null/undefined target or map", () => {
        expect(() => applyMsgLevelExternalFields(null, { from_is_external: 1 })).not.toThrow()
        expect(() => applyMsgLevelExternalFields({}, null)).not.toThrow()
        expect(() => applyMsgLevelExternalFields({}, undefined)).not.toThrow()
    })
})

/**
 * dmwork-web#1069 round 4：
 *
 * WebSocket 推送 / send-ack 回放路径（Message.fromSendPacket / `new Message(recvPacket)`）
 * 的二进制 wire protocol 不携带 from_home_space_* 字段，只能通过 fromUID 反查
 * channelInfo.orgData 兜底。`applyMsgLevelExternalFieldsWithFallback`
 * 与 `patchSdkDecodeForExternalFields` 对 `Message.fromSendPacket` 的 wrap
 * 确保这条路径的 Message 对象最终携带 home_space_id / home_space_name。
 */
describe("applyMsgLevelExternalFieldsWithFallback — channelInfo fallback", () => {
    const yujiaweiUID = "uid-yujiawei"
    const originalGet = WKSDK.shared().channelManager.getChannelInfo

    afterEach(() => {
        WKSDK.shared().channelManager.getChannelInfo = originalGet
    })

    const stubChannelInfo = (orgData: Record<string, any> | null) => {
        WKSDK.shared().channelManager.getChannelInfo = ((ch: Channel): ChannelInfo | undefined => {
            if (!ch || ch.channelID !== yujiaweiUID) return undefined
            if (orgData === null) return undefined
            const info = new ChannelInfo()
            info.channel = ch
            info.orgData = orgData
            return info
        }) as any
    }

    it("prefers wire-carried fields over channelInfo orgData", () => {
        stubChannelInfo({ home_space_id: "from-org", home_space_name: "FromOrg" })
        const target: any = { fromUID: yujiaweiUID }
        applyMsgLevelExternalFieldsWithFallback(target, {
            from_home_space_id: "from-wire",
            from_home_space_name: "FromWire",
        })
        expect(target.from_home_space_id).toBe("from-wire")
        expect(target.from_home_space_name).toBe("FromWire")
    })

    it("falls back to channelInfo.orgData when wire lacks home_space_id/name", () => {
        stubChannelInfo({ home_space_id: "minglue_default", home_space_name: "MlampWork" })
        const target: any = { fromUID: yujiaweiUID }
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("minglue_default")
        expect(target.from_home_space_name).toBe("MlampWork")
    })

    it("leaves fields undefined when channelInfo lookup misses", () => {
        stubChannelInfo(null)
        const target: any = { fromUID: "uid-unknown" }
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBeUndefined()
        expect(target.from_home_space_name).toBeUndefined()
    })

    it("accepts fromUID from msgMap when target.fromUID is missing", () => {
        stubChannelInfo({ home_space_id: "minglue_default", home_space_name: "MlampWork" })
        const target: any = {}
        applyMsgLevelExternalFieldsWithFallback(target, { from_uid: yujiaweiUID })
        expect(target.from_home_space_id).toBe("minglue_default")
        expect(target.from_home_space_name).toBe("MlampWork")
    })

    it("no-ops when channelManager.getChannelInfo throws", () => {
        WKSDK.shared().channelManager.getChannelInfo = (() => {
            throw new Error("not initialized")
        }) as any
        const target: any = { fromUID: yujiaweiUID }
        expect(() => applyMsgLevelExternalFieldsWithFallback(target, undefined)).not.toThrow()
        expect(target.from_home_space_id).toBeUndefined()
    })

    it("does not overwrite an empty-but-set wire value when orgData has one (ignores empty strings)", () => {
        // empty string on target is treated as "needs fallback"
        stubChannelInfo({ home_space_id: "minglue_default" })
        const target: any = { fromUID: yujiaweiUID, from_home_space_id: "" }
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("minglue_default")
    })
})

/**
 * dmwork-web#1069 round 4：
 *
 * `Message.fromSendPacket` 用于当前用户发送消息 / send-ack 回放等场景。
 * 补丁在原 static 的基础上 wrap，确保消息对象同样携带 msg-level 外部来源字段；
 * 若 sendPacket 未直接携带（wire 只有 payload / fromUID / channel），
 * 通过 channelInfo.orgData 以 fromUID 反查补齐。
 */
describe("patchSdkDecodeForExternalFields — Message.fromSendPacket wrapper", () => {
    const viewerUID = "uid-self"
    const originalGet = WKSDK.shared().channelManager.getChannelInfo

    beforeAll(() => {
        patchSdkDecodeForExternalFields()
    })

    afterEach(() => {
        WKSDK.shared().channelManager.getChannelInfo = originalGet
    })

    const makeSendPacket = (overrides: Record<string, any> = {}): any => ({
        fromUID: viewerUID,
        channelID: "g123",
        channelType: 2,
        clientMsgNo: "cmn-1",
        clientSeq: 1,
        payload: new Uint8Array(),
        ...overrides,
    })

    it("returns a Message instance with preserved send-path fields (clientSeq / fromUID)", () => {
        const packet = makeSendPacket()
        const msg: any = Message.fromSendPacket(packet)
        expect(msg).toBeInstanceOf(Message)
        expect(msg.fromUID).toBe(viewerUID)
        expect(msg.clientSeq).toBe(1)
        expect(msg.clientMsgNo).toBe("cmn-1")
    })

    it("stashes from_home_space_* when sendPacket carries them (simulating hypothetical wire extra)", () => {
        const packet = makeSendPacket({
            from_home_space_id: "minglue_default",
            from_home_space_name: "MlampWork",
        })
        const msg: any = Message.fromSendPacket(packet)
        expect(msg.from_home_space_id).toBe("minglue_default")
        expect(msg.from_home_space_name).toBe("MlampWork")
    })

    it("falls back to channelInfo.orgData when sendPacket lacks from_home_space_* (real wire case)", () => {
        WKSDK.shared().channelManager.getChannelInfo = ((ch: Channel): ChannelInfo | undefined => {
            if (!ch || ch.channelID !== viewerUID || ch.channelType !== ChannelTypePerson) return undefined
            const info = new ChannelInfo()
            info.channel = ch
            info.orgData = {
                home_space_id: "minglue_default",
                home_space_name: "MlampWork",
            }
            return info
        }) as any
        const packet = makeSendPacket()
        const msg: any = Message.fromSendPacket(packet)
        expect(msg.from_home_space_id).toBe("minglue_default")
        expect(msg.from_home_space_name).toBe("MlampWork")
    })

    it("leaves home_space_* undefined when neither wire nor channelInfo provides them", () => {
        WKSDK.shared().channelManager.getChannelInfo = (() => undefined) as any
        const packet = makeSendPacket()
        const msg: any = Message.fromSendPacket(packet)
        expect(msg.from_home_space_id).toBeUndefined()
        expect(msg.from_home_space_name).toBeUndefined()
    })

    it("is idempotent: second patchSdkDecodeForExternalFields call does not double-wrap", () => {
        // already patched in beforeAll; calling again must not throw nor chain
        patchSdkDecodeForExternalFields()
        WKSDK.shared().channelManager.getChannelInfo = ((ch: Channel): ChannelInfo | undefined => {
            const info = new ChannelInfo()
            info.channel = ch
            info.orgData = { home_space_id: "space-x", home_space_name: "X" }
            return info
        }) as any
        const msg: any = Message.fromSendPacket(makeSendPacket())
        expect(msg.from_home_space_id).toBe("space-x")
        expect(msg.from_home_space_name).toBe("X")
    })
})

/**
 * dmwork-web#1069 round 4：
 *
 * WebSocket 推送路径 `new Message(recvPacket)` 无法在 SDK 内部构造器处挂钩
 * （patch 构造器会破坏 instanceof）。改为 patch
 * `ChatManager.prototype.notifyMessageListeners`：在派发给业务 listener 前
 * 以 fromUID 从 channelInfo.orgData 兜底补齐 home_space_id / home_space_name。
 */
describe("patchSdkDecodeForExternalFields — ChatManager.notifyMessageListeners wrapper", () => {
    const senderUID = "uid-yujiawei"
    const originalGet = WKSDK.shared().channelManager.getChannelInfo

    beforeAll(() => {
        patchSdkDecodeForExternalFields()
    })

    afterEach(() => {
        WKSDK.shared().channelManager.getChannelInfo = originalGet
    })

    it("applies channelInfo fallback to messages delivered via WebSocket push", () => {
        WKSDK.shared().channelManager.getChannelInfo = ((ch: Channel): ChannelInfo | undefined => {
            if (!ch || ch.channelID !== senderUID) return undefined
            const info = new ChannelInfo()
            info.channel = ch
            info.orgData = {
                home_space_id: "minglue_default",
                home_space_name: "MlampWork",
            }
            return info
        }) as any

        const msg: any = new Message()
        msg.fromUID = senderUID
        msg.channel = new Channel("g123", 2)
        // notifyMessageListeners internally inspects msg.contentType → msg.content.contentType
        msg.content = { contentType: 1 }

        let received: any = null
        const listener = (m: Message) => {
            received = m
        }
        const chatManager = WKSDK.shared().chatManager
        chatManager.addMessageListener(listener)
        try {
            chatManager.notifyMessageListeners(msg)
        } finally {
            chatManager.removeMessageListener(listener)
        }

        expect(received).toBe(msg)
        expect(received.from_home_space_id).toBe("minglue_default")
        expect(received.from_home_space_name).toBe("MlampWork")
    })

    it("is a no-op when channelInfo lookup misses the sender", () => {
        WKSDK.shared().channelManager.getChannelInfo = (() => undefined) as any

        const msg: any = new Message()
        msg.fromUID = "uid-unknown"
        msg.channel = new Channel("g123", 2)
        msg.content = { contentType: 1 }

        let received: any = null
        const listener = (m: Message) => {
            received = m
        }
        const chatManager = WKSDK.shared().chatManager
        chatManager.addMessageListener(listener)
        try {
            expect(() => chatManager.notifyMessageListeners(msg)).not.toThrow()
        } finally {
            chatManager.removeMessageListener(listener)
        }

        expect(received).toBe(msg)
        expect(received.from_home_space_id).toBeUndefined()
        expect(received.from_home_space_name).toBeUndefined()
    })
})
