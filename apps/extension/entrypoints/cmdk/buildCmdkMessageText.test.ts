import { describe, it, expect, vi } from "vitest";

// formatMentionTextV2 的真实实现牵动整个 @dmwork/base 包，
// 这里 mock 成只透传 content + 简易解析 @[uid:name] 的桩，专注测正文拼装逻辑
vi.mock("@dmwork/base/src/Components/MessageInput", () => ({
  formatMentionTextV2: (text: string) => ({ content: text, mention: undefined }),
}));

import { buildCmdkMessageText } from "./buildCmdkMessageText";

const ctxFull = {
  selectedText: "选段内容",
  pageUrl: "https://example.com/p",
  pageTitle: "页面标题",
  hostname: "example.com",
};

describe("buildCmdkMessageText - 默认（短引用）", () => {
  it("有 pageUrl + 选段 + 用户输入 → 引用块包裹来源 + 选段，下面是用户输入", () => {
    const r = buildCmdkMessageText("我的评论", ctxFull);
    expect(r.content).toBe(
      "> 来自 🌐 [页面标题](https://example.com/p)\n> \n> 选段内容\n\n我的评论"
    );
  });

  it("有 pageUrl + 选段 + 空输入 → 仅引用块", () => {
    const r = buildCmdkMessageText("", ctxFull);
    expect(r.content).toBe(
      "> 来自 🌐 [页面标题](https://example.com/p)\n> \n> 选段内容"
    );
  });

  it("有 pageUrl 但无选段 → 引用块仅含来源行", () => {
    const r = buildCmdkMessageText("评论", {
      ...ctxFull,
      selectedText: "",
    });
    expect(r.content).toBe(
      "> 来自 🌐 [页面标题](https://example.com/p)\n\n评论"
    );
  });

  it("无 pageUrl 但有选段 → 引用块仅含选段（无来源行）", () => {
    const r = buildCmdkMessageText("评论", {
      ...ctxFull,
      pageUrl: "",
    });
    expect(r.content).toBe("> 选段内容\n\n评论");
  });

  it("context 为 null + 仅用户输入 → 直接输出输入", () => {
    const r = buildCmdkMessageText("hello", null);
    expect(r.content).toBe("hello");
  });

  it("trim 用户输入前后空白", () => {
    const r = buildCmdkMessageText("   hello   ", null);
    expect(r.content).toBe("hello");
  });

  it("title 缺失时 label fallback 为 pageUrl", () => {
    const r = buildCmdkMessageText("", { ...ctxFull, pageTitle: "" });
    expect(r.content).toContain(
      "[https://example.com/p](https://example.com/p)"
    );
  });

  it("选段含换行 → 每行加 `> ` 前缀", () => {
    const r = buildCmdkMessageText("", {
      ...ctxFull,
      selectedText: "第一行\n第二行",
    });
    expect(r.content).toContain("> 第一行\n> 第二行");
  });
});

describe("buildCmdkMessageText - skipQuotedBody（长文本场景）", () => {
  it("有用户输入 → 只输出用户输入（不带来源/选段）", () => {
    const r = buildCmdkMessageText("我的评论", ctxFull, {
      skipQuotedBody: true,
    });
    expect(r.content).toBe("我的评论");
  });

  it("空输入 → 输出空字符串（来源已写入 .md，调用方决定要不要发）", () => {
    const r = buildCmdkMessageText("", ctxFull, { skipQuotedBody: true });
    expect(r.content).toBe("");
  });

  it("不论 ctx 有什么，都不会出现引用块 `>`", () => {
    const r = buildCmdkMessageText("hi", ctxFull, { skipQuotedBody: true });
    expect(r.content).not.toContain(">");
    expect(r.content).not.toContain("来自");
  });
});
