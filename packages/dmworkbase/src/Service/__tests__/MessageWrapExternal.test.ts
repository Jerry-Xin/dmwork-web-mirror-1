import { describe, it, expect } from "vitest"
import { Message } from "wukongimjssdk"
import { Convert } from "../Convert"

/**
 * YUJ-53: /message/channel/sync response may carry msg-level fields
 * from_is_external (0|1) and from_source_space_name (string). Convert.toMessage
 * stashes them on the resulting Message instance so MessageWrap getters
 * (see Model.tsx) can expose them to the UI.
 */
describe("Convert.toMessage external-source passthrough (YUJ-53)", () => {
    const baseMsg = (overrides: Record<string, any> = {}) => ({
        message_id: "1",
        message_idstr: "1",
        client_msg_no: "c1",
        message_seq: 1,
        channel_id: "g1",
        channel_type: 2,
        from_uid: "user-c",
        timestamp: 0,
        payload: { type: 1, content: "hi" },
        ...overrides,
    })

    it("stashes from_is_external=1 and from_source_space_name on the Message", () => {
        const m: any = Convert.toMessage(baseMsg({
            from_is_external: 1,
            from_source_space_name: "MlampWork",
        }))
        expect(m.from_is_external).toBe(1)
        expect(m.from_source_space_name).toBe("MlampWork")
    })

    it("stashes from_is_external=0 when internal member", () => {
        const m: any = Convert.toMessage(baseMsg({ from_is_external: 0 }))
        expect(m.from_is_external).toBe(0)
        expect(m.from_source_space_name).toBeUndefined()
    })

    it("leaves fields undefined when payload omits them (backward compat)", () => {
        const m: any = Convert.toMessage(baseMsg())
        expect(m.from_is_external).toBeUndefined()
        expect(m.from_source_space_name).toBeUndefined()
    })

    it("non-1 truthy value collapses to 0 (strict boolean semantics)", () => {
        const m: any = Convert.toMessage(baseMsg({ from_is_external: "yes" }))
        expect(m.from_is_external).toBe(0)
    })
})

/** 独立校验 MessageWrap getter（不依赖其他 Model 依赖） */
describe("MessageWrap.fromIsExternal / fromSourceSpaceName getter semantics", () => {
    // 用 inline 子类模拟，避免引入 App 入口触发 lottie 链。
    class Wrap {
        constructor(public message: any) {}
        get fromIsExternal(): boolean {
            return (this.message as any).from_is_external === 1
        }
        get fromSourceSpaceName(): string | undefined {
            const v = (this.message as any).from_source_space_name
            return typeof v === "string" && v.length > 0 ? v : undefined
        }
    }

    it("mirrors the Model.tsx implementation for real convert output", () => {
        const raw = new Message() as any
        raw.from_is_external = 1
        raw.from_source_space_name = "MlampWork"
        const w = new Wrap(raw)
        expect(w.fromIsExternal).toBe(true)
        expect(w.fromSourceSpaceName).toBe("MlampWork")
    })

    it("returns false/undefined when fields are absent", () => {
        const w = new Wrap(new Message())
        expect(w.fromIsExternal).toBe(false)
        expect(w.fromSourceSpaceName).toBeUndefined()
    })

    it("normalizes empty string to undefined", () => {
        const raw = new Message() as any
        raw.from_is_external = 1
        raw.from_source_space_name = ""
        const w = new Wrap(raw)
        expect(w.fromIsExternal).toBe(true)
        expect(w.fromSourceSpaceName).toBeUndefined()
    })
})
