import { describe, expect, it } from "vitest"
import { getPulldownRestoredScrollTop, shouldPulldownOnWheel, TOP_HISTORY_TRIGGER_OFFSET } from "../historyScroll"

describe("getPulldownRestoredScrollTop", () => {
    it("keeps the visible anchor stable by restoring the scroll height delta", () => {
        expect(getPulldownRestoredScrollTop({
            previousScrollHeight: 1200,
            previousScrollTop: 180,
            nextScrollHeight: 1560,
        })).toBe(540)
    })

    it("never restores to a negative scrollTop", () => {
        expect(getPulldownRestoredScrollTop({
            previousScrollHeight: 1200,
            previousScrollTop: 0,
            nextScrollHeight: 1000,
        })).toBe(0)
    })
})

describe("shouldPulldownOnWheel", () => {
    it("triggers pulldown when content is not full screen", () => {
        expect(shouldPulldownOnWheel(-12, 600, false)).toBe(true)
    })

    it("triggers pulldown near the top even when content is full screen", () => {
        expect(shouldPulldownOnWheel(-12, TOP_HISTORY_TRIGGER_OFFSET, true)).toBe(true)
    })

    it("does not trigger pulldown away from the top in a full screen list", () => {
        expect(shouldPulldownOnWheel(-12, TOP_HISTORY_TRIGGER_OFFSET + 1, true)).toBe(false)
    })

    it("does not trigger pulldown on downward wheel movement", () => {
        expect(shouldPulldownOnWheel(12, 0, false)).toBe(false)
    })
})
