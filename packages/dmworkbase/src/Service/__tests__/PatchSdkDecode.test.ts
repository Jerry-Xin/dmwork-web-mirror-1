import { describe, it, expect, beforeAll, afterEach } from "vitest"
import {
    Reply,
    Message,
    WKSDK,
    Channel,
    ChannelTypePerson,
    ChannelTypeGroup,
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
 * dmwork-web#1069 round 5：
 *
 * R4 单独依赖 Person channel cache 作为 home_space_* 兜底源，但浏览器只缓存
 * 用户**主动开过 1v1** 的 Person channel。群聊里从没跟对方私聊过的发送者
 * → Person cache miss → R4 兜底命中率 = 0（im-test 2026-04-29 实测）。
 *
 * R5 改数据源：优先从「群成员列表 cache」反查发送者的 home_space_*。
 * 后端 dmworkim#1233 已在群成员列表 API enrich 了发送者级别的 home_space_id /
 * home_space_name；这份 cache 只要用户打开过这个群就会热起来，命中率远高于
 * Person channel。Person channel 兜底保留为「最后防线」，仅在群成员列表
 * miss 时接管（用户确实跟对方 1v1 聊过 → 老路径仍能生效）。
 *
 * 字段优先级保持不变：wire > 群成员列表 > Person channel。空串视为未设置。
 */
describe("applyMsgLevelExternalFieldsWithFallback — group-member fallback (R5)", () => {
    const senderUID = "uid-sender"
    const groupNo = "g-external-001"
    const originalGetSubscribes = WKSDK.shared().channelManager.getSubscribes
    const originalGetChannelInfo = WKSDK.shared().channelManager.getChannelInfo

    afterEach(() => {
        WKSDK.shared().channelManager.getSubscribes = originalGetSubscribes
        WKSDK.shared().channelManager.getChannelInfo = originalGetChannelInfo
    })

    const stubSubscribers = (members: Array<any> | null | undefined, expectedGroup: string = groupNo) => {
        WKSDK.shared().channelManager.getSubscribes = ((ch: Channel): any => {
            if (!ch || ch.channelType !== ChannelTypeGroup || ch.channelID !== expectedGroup) {
                return []
            }
            return members as any
        }) as any
    }

    const stubPersonChannelInfo = (orgData: Record<string, any> | null | undefined) => {
        WKSDK.shared().channelManager.getChannelInfo = ((ch: Channel): ChannelInfo | undefined => {
            if (!ch || ch.channelType !== ChannelTypePerson || ch.channelID !== senderUID) return undefined
            if (!orgData) return undefined
            const info = new ChannelInfo()
            info.channel = ch
            info.orgData = orgData
            return info
        }) as any
    }

    const groupMessage = (): any => ({
        fromUID: senderUID,
        channel: new Channel(groupNo, ChannelTypeGroup),
    })

    // ── wire 有字段 → 不覆盖 ──────────────────────────────────────────────
    it("wire-carried fields win over group-member orgData even in a group message", () => {
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "from-member", home_space_name: "FromMember" } }])
        stubPersonChannelInfo({ home_space_id: "from-person", home_space_name: "FromPerson" })
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, {
            from_home_space_id: "from-wire",
            from_home_space_name: "FromWire",
        })
        expect(target.from_home_space_id).toBe("from-wire")
        expect(target.from_home_space_name).toBe("FromWire")
    })

    // ── wire 无字段 + 群成员列表有 → 用群成员列表的值 ────────────────────
    it("falls back to group-member orgData.home_space_id/name when wire lacks them", () => {
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "minglue_default", home_space_name: "MlampWork" } }])
        // 即便 Person cache 也有值，R5 应优先群成员列表
        stubPersonChannelInfo({ home_space_id: "should-not-use", home_space_name: "ShouldNotUse" })
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("minglue_default")
        expect(target.from_home_space_name).toBe("MlampWork")
    })

    it("uses group-member orgData when multiple members are present (picks by uid)", () => {
        stubSubscribers([
            { uid: "uid-other", orgData: { home_space_id: "other", home_space_name: "Other" } },
            { uid: senderUID, orgData: { home_space_id: "minglue_default", home_space_name: "MlampWork" } },
            { uid: "uid-third", orgData: { home_space_id: "third", home_space_name: "Third" } },
        ])
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("minglue_default")
        expect(target.from_home_space_name).toBe("MlampWork")
    })

    // ── wire 无字段 + 群成员列表无 + Person channel 有 → fallback to Person ──
    it("falls back to Person channel orgData when group-member list is empty", () => {
        stubSubscribers([])
        stubPersonChannelInfo({ home_space_id: "person-id", home_space_name: "PersonName" })
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("person-id")
        expect(target.from_home_space_name).toBe("PersonName")
    })

    it("falls back to Person channel when getSubscribes returns undefined", () => {
        stubSubscribers(undefined)
        stubPersonChannelInfo({ home_space_id: "person-id", home_space_name: "PersonName" })
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("person-id")
        expect(target.from_home_space_name).toBe("PersonName")
    })

    it("falls back to Person channel when sender uid is not in the group-member list", () => {
        stubSubscribers([{ uid: "uid-other", orgData: { home_space_id: "other", home_space_name: "Other" } }])
        stubPersonChannelInfo({ home_space_id: "person-id", home_space_name: "PersonName" })
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("person-id")
        expect(target.from_home_space_name).toBe("PersonName")
    })

    it("falls back to Person channel when matching member has no orgData", () => {
        stubSubscribers([{ uid: senderUID }])
        stubPersonChannelInfo({ home_space_id: "person-id", home_space_name: "PersonName" })
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("person-id")
        expect(target.from_home_space_name).toBe("PersonName")
    })

    it("merges partial group-member and Person-channel values per field", () => {
        // group 有 id 但无 name；Person 有 name
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "minglue_default" } }])
        stubPersonChannelInfo({ home_space_name: "MlampWork" })
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("minglue_default")
        expect(target.from_home_space_name).toBe("MlampWork")
    })

    it("ignores empty-string home_space_* in group-member orgData and defers to Person fallback", () => {
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "", home_space_name: "" } }])
        stubPersonChannelInfo({ home_space_id: "person-id", home_space_name: "PersonName" })
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("person-id")
        expect(target.from_home_space_name).toBe("PersonName")
    })

    // ── wire 无字段 + 全都没 → 保持空，异常静默 ──────────────────────────
    it("leaves home_space_* undefined when group list and Person channel both miss", () => {
        stubSubscribers([])
        stubPersonChannelInfo(null)
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBeUndefined()
        expect(target.from_home_space_name).toBeUndefined()
    })

    it("silently swallows exceptions from getSubscribes and falls through to Person channel", () => {
        WKSDK.shared().channelManager.getSubscribes = (() => {
            throw new Error("channelManager not initialized")
        }) as any
        stubPersonChannelInfo({ home_space_id: "person-id", home_space_name: "PersonName" })
        const target = groupMessage()
        expect(() => applyMsgLevelExternalFieldsWithFallback(target, undefined)).not.toThrow()
        expect(target.from_home_space_id).toBe("person-id")
        expect(target.from_home_space_name).toBe("PersonName")
    })

    // ── 仅 Person 频道路径（非群消息） ───────────────────────────────────
    it("does not consult group-member list when target.channel is a Person channel", () => {
        let subscribesCalled = false
        WKSDK.shared().channelManager.getSubscribes = ((_ch: Channel) => {
            subscribesCalled = true
            return []
        }) as any
        stubPersonChannelInfo({ home_space_id: "person-id", home_space_name: "PersonName" })
        const target: any = {
            fromUID: senderUID,
            channel: new Channel(senderUID, ChannelTypePerson),
        }
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(subscribesCalled).toBe(false)
        expect(target.from_home_space_id).toBe("person-id")
    })

    it("does not consult group-member list when target has no channel at all", () => {
        let subscribesCalled = false
        WKSDK.shared().channelManager.getSubscribes = ((_ch: Channel) => {
            subscribesCalled = true
            return []
        }) as any
        stubPersonChannelInfo({ home_space_id: "person-id", home_space_name: "PersonName" })
        const target: any = { fromUID: senderUID }
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(subscribesCalled).toBe(false)
        expect(target.from_home_space_id).toBe("person-id")
    })

    // ── msgMap 携带 channelID/channelType（SendPacket 格式） ──────────────
    it("resolves group channel from msgMap.channelID+channelType when target.channel is absent", () => {
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "minglue_default", home_space_name: "MlampWork" } }])
        const target: any = { fromUID: senderUID } // no target.channel
        applyMsgLevelExternalFieldsWithFallback(target, {
            channelID: groupNo,
            channelType: ChannelTypeGroup,
        })
        expect(target.from_home_space_id).toBe("minglue_default")
        expect(target.from_home_space_name).toBe("MlampWork")
    })

    it("prefers target.channel over msgMap channel fields", () => {
        // msgMap claims a different group; target.channel is the real one
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "minglue_default", home_space_name: "MlampWork" } }], groupNo)
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, {
            channelID: "g-wrong-group",
            channelType: ChannelTypeGroup,
        })
        expect(target.from_home_space_id).toBe("minglue_default")
    })

    // ── fromUID 来源兼容 ────────────────────────────────────────────────
    it("accepts fromUID from msgMap.from_uid when target.fromUID is missing", () => {
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "minglue_default", home_space_name: "MlampWork" } }])
        const target: any = { channel: new Channel(groupNo, ChannelTypeGroup) }
        applyMsgLevelExternalFieldsWithFallback(target, { from_uid: senderUID })
        expect(target.from_home_space_id).toBe("minglue_default")
        expect(target.from_home_space_name).toBe("MlampWork")
    })

    // ── 幂等：既有值不被群成员 cache 覆盖 ────────────────────────────────
    it("never overwrites already-set target fields with group-member values", () => {
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "should-not-overwrite", home_space_name: "ShouldNotOverwrite" } }])
        const target: any = {
            ...groupMessage(),
            from_home_space_id: "existing-id",
            from_home_space_name: "ExistingName",
        }
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(target.from_home_space_id).toBe("existing-id")
        expect(target.from_home_space_name).toBe("ExistingName")
    })

    // ── 短路：双字段都在时不查任何 cache ────────────────────────────────
    it("short-circuits when wire already provided both fields (no cache read)", () => {
        let subscribesCalled = false
        let channelInfoCalled = false
        WKSDK.shared().channelManager.getSubscribes = ((_ch: Channel) => {
            subscribesCalled = true
            return []
        }) as any
        WKSDK.shared().channelManager.getChannelInfo = ((_ch: Channel) => {
            channelInfoCalled = true
            return undefined
        }) as any
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, {
            from_home_space_id: "wire-id",
            from_home_space_name: "wire-name",
        })
        expect(subscribesCalled).toBe(false)
        expect(channelInfoCalled).toBe(false)
    })

    // ── 无 fromUID 则静默退出 ────────────────────────────────────────────
    it("is a no-op when fromUID cannot be resolved from either source", () => {
        let subscribesCalled = false
        WKSDK.shared().channelManager.getSubscribes = ((_ch: Channel) => {
            subscribesCalled = true
            return []
        }) as any
        const target: any = { channel: new Channel(groupNo, ChannelTypeGroup) } // no fromUID
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(subscribesCalled).toBe(false)
        expect(target.from_home_space_id).toBeUndefined()
    })

    // ── 异常路径：getChannelInfo 抛错时群成员列表命中仍正常返回 ─────────
    it("still succeeds via group-member list when only Person-channel lookup throws", () => {
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "minglue_default", home_space_name: "MlampWork" } }])
        WKSDK.shared().channelManager.getChannelInfo = (() => {
            throw new Error("should not be called but stays safe")
        }) as any
        const target = groupMessage()
        expect(() => applyMsgLevelExternalFieldsWithFallback(target, undefined)).not.toThrow()
        expect(target.from_home_space_id).toBe("minglue_default")
        expect(target.from_home_space_name).toBe("MlampWork")
    })

    // ── 群成员列表命中后的 Person 兜底不被触发 ──────────────────────────
    it("does not call Person-channel getChannelInfo when group-member list fully satisfies", () => {
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "minglue_default", home_space_name: "MlampWork" } }])
        let channelInfoCalled = false
        WKSDK.shared().channelManager.getChannelInfo = ((_ch: Channel) => {
            channelInfoCalled = true
            return undefined
        }) as any
        const target = groupMessage()
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        expect(channelInfoCalled).toBe(false)
        expect(target.from_home_space_id).toBe("minglue_default")
    })

    // ── 群是不同 group_no 时不误命中 ────────────────────────────────────
    it("scopes group-member lookup to the msg's own group channel", () => {
        // stub only returns members for 'g-external-001'; target.channel is a different group
        stubSubscribers([{ uid: senderUID, orgData: { home_space_id: "minglue_default", home_space_name: "MlampWork" } }], groupNo)
        stubPersonChannelInfo({ home_space_id: "person-id", home_space_name: "PersonName" })
        const target: any = {
            fromUID: senderUID,
            channel: new Channel("g-different-group", ChannelTypeGroup),
        }
        applyMsgLevelExternalFieldsWithFallback(target, undefined)
        // Lookup misses on the different group → falls through to Person cache
        expect(target.from_home_space_id).toBe("person-id")
        expect(target.from_home_space_name).toBe("PersonName")
    })
})

/**
 * dmwork-web#1069 round 5：
 *
 * R4 在 `patchSdkDecodeForExternalFields` 里追加了两个 monkey patch
 * (`Message.fromSendPacket`、`ChatManager.prototype.notifyMessageListeners`)；
 * 线上证实对"只在群见过、没开过 1v1"的外部成员无效——R4 配套的 Person-channel
 * fallback 100% cache miss。R5 把兜底逻辑搬到业务层（ConversationVM），
 * 并**撤掉**这两个 SDK prototype patch。下面的测试锁定这条维护纪律：
 *   - 只允许 patch `Reply.prototype.decode`
 *   - `Message.fromSendPacket` / `ChatManager.notifyMessageListeners` 必须为 SDK 原生函数
 */
describe("patchSdkDecodeForExternalFields — R5 drops dead SDK prototype patches", () => {
    beforeAll(() => {
        patchSdkDecodeForExternalFields()
    })

    it("does NOT patch Message.fromSendPacket (R4 wrapper removed)", () => {
        const fromSendPacket = (Message as any).fromSendPacket
        expect(typeof fromSendPacket).toBe("function")
        // R5 wrapper 不再挂 __dmworkPatched 等标记，也不会在 fn 源码里调用
        // applyMsgLevelExternalFieldsWithFallback；直接断言函数体不含该符号。
        const body = Function.prototype.toString.call(fromSendPacket)
        expect(body).not.toContain("applyMsgLevelExternalFieldsWithFallback")
    })

    it("does NOT patch ChatManager.prototype.notifyMessageListeners (R4 wrapper removed)", () => {
        const chatManager: any = WKSDK.shared().chatManager
        const proto: any = chatManager && Object.getPrototypeOf(chatManager)
        if (!proto || typeof proto.notifyMessageListeners !== "function") return
        const body = Function.prototype.toString.call(proto.notifyMessageListeners)
        expect(body).not.toContain("applyMsgLevelExternalFieldsWithFallback")
    })

    it("keeps the Reply.prototype.decode patch (still the only sanctioned prototype patch)", () => {
        // 通过行为验证：Reply.decode 仍会透传 from_home_space_*
        const reply: any = new Reply()
        reply.decode({
            message_id: "r-1",
            from_uid: "u",
            root_message_id: "9",
            from_home_space_id: "space-ml",
            from_home_space_name: "MlampWork",
        })
        expect(reply.from_home_space_id).toBe("space-ml")
        expect(reply.from_home_space_name).toBe("MlampWork")
    })
})
