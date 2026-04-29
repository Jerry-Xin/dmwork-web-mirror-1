import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it, expect } from "vitest"
import MessageRow from "../index"

/**
 * YUJ-98 R7 — 老组件 `wk-msg-row-header` 补齐 @SpaceName 渲染。
 *
 * 背景：
 *   R1-R6 五轮都改的是新组件 `wk-msg-head`，但真正上屏的是这个老组件
 *   `wk-msg-row-header`（Yu 15:13 PC Chrome fiber 爬虫定位）：
 *     - msg-level `fromHomeSpaceId` = "minglue_default" ✅
 *     - resolveExternalForViewer → isExternal=true, sourceSpaceName="MlampWork" ✅
 *     - 但 DOM 里 .wk-msg-head-space 压根不存在（这个老组件没渲染）
 *
 *   这组测试把「@SpaceName 真的渲染到了 wk-msg-row-header 的 DOM 里」这一层
 *   钉死，任何回归（忘记透传 props、误删分支、或又一次只改新组件）都会红。
 */
describe("MessageRow — @SpaceName suffix in wk-msg-row-header", () => {
    const baseProps = {
        isSend: false,
        isContinue: false,
        isSelected: false,
        showAvatar: true,
        avatarUrl: "https://example.test/avatar.png",
        senderName: "yujiawei",
        timestamp: "10:30",
    }

    it("renders @SpaceName when isExternal=true and sourceSpaceName is present (cross-space case)", () => {
        // 跨 Space 场景：viewer = 测试空间1，sender home = MlampWork
        const html = renderToStaticMarkup(
            <MessageRow
                {...baseProps}
                isExternal={true}
                sourceSpaceName="MlampWork"
            >
                <div className="msg-body">hello</div>
            </MessageRow>
        )
        expect(html).toContain("yujiawei")
        // 关键断言：老组件 header 里必须有 @SpaceName
        expect(html).toMatch(/wk-msg-row-sender-space/)
        expect(html).toContain("@MlampWork")
        expect(html).toMatch(/title="@MlampWork"/)
        // 必须出现在 wk-msg-row-header 容器内（避免跑偏到别处）
        expect(html).toMatch(
            /wk-msg-row-header[\s\S]*wk-msg-row-sender-space/
        )
    })

    it("does NOT render @SpaceName when isExternal=false (same-space case)", () => {
        // 同 Space 场景：viewer 与 sender 同 Space，isExternal=false
        const html = renderToStaticMarkup(
            <MessageRow
                {...baseProps}
                isExternal={false}
                sourceSpaceName="MlampWork"
            >
                <div className="msg-body">hello</div>
            </MessageRow>
        )
        expect(html).toContain("yujiawei")
        expect(html).not.toMatch(/wk-msg-row-sender-space/)
        expect(html).not.toContain("@MlampWork")
    })

    it("does NOT render @SpaceName when sourceSpaceName is missing/empty even if isExternal=true", () => {
        // 防守：homeSpaceId 在但 homeSpaceName 为空时不应显示空的 `@` 字符
        const htmlEmpty = renderToStaticMarkup(
            <MessageRow
                {...baseProps}
                isExternal={true}
                sourceSpaceName=""
            >
                <div className="msg-body">hello</div>
            </MessageRow>
        )
        expect(htmlEmpty).not.toMatch(/wk-msg-row-sender-space/)

        const htmlUndef = renderToStaticMarkup(
            <MessageRow
                {...baseProps}
                isExternal={true}
                // sourceSpaceName omitted
            >
                <div className="msg-body">hello</div>
            </MessageRow>
        )
        expect(htmlUndef).not.toMatch(/wk-msg-row-sender-space/)
    })

    it("does NOT render the header at all when isContinue=true (连续消息沿用上一条 header)", () => {
        const html = renderToStaticMarkup(
            <MessageRow
                {...baseProps}
                isContinue={true}
                showAvatar={false}
                isExternal={true}
                sourceSpaceName="MlampWork"
            >
                <div className="msg-body">continued</div>
            </MessageRow>
        )
        // 连续消息压根没 wk-msg-row-header 容器，@SpaceName 也就不出现
        expect(html).not.toMatch(/wk-msg-row-header/)
        expect(html).not.toContain("@MlampWork")
    })
})
