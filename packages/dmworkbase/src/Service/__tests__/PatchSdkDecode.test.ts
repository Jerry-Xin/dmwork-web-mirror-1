import { describe, it, expect, beforeAll } from "vitest"
import { Reply } from "wukongimjssdk"
import {
    applyMsgLevelExternalFields,
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
