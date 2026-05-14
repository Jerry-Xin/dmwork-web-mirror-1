import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildSelectionMarkdownFile,
  _testables,
} from "./buildSelectionMarkdownFile";

const { sanitizeForFilename, formatTimestamp } = _testables;

describe("sanitizeForFilename", () => {
  it("去掉跨平台非法字符", () => {
    expect(sanitizeForFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("abcdefghij");
  });

  it("保留中文 / emoji / 普通空格", () => {
    expect(sanitizeForFilename("关注 Tab 🚀 改版")).toBe("关注 Tab 🚀 改版");
  });

  it("把多个连续空格压成单个空格", () => {
    expect(sanitizeForFilename("a   b   c")).toBe("a b c");
  });

  it("制表符 / 换行作为控制字符被先除掉，相邻 token 直接连起来", () => {
    expect(sanitizeForFilename("a\tb\nc")).toBe("abc");
  });

  it("去除控制字符", () => {
    expect(sanitizeForFilename("a\x00b\x1fc")).toBe("abc");
  });

  it("trim 前后空白", () => {
    expect(sanitizeForFilename("  hello  ")).toBe("hello");
  });

  it("超过 40 字符截断", () => {
    const longCn = "中".repeat(60);
    expect(sanitizeForFilename(longCn)).toHaveLength(40);
  });

  it("空字符串 / 全非法字符 → 空字符串", () => {
    expect(sanitizeForFilename("")).toBe("");
    expect(sanitizeForFilename('///***???')).toBe("");
  });
});

describe("formatTimestamp", () => {
  it("月/日/时/分/秒补零", () => {
    const d = new Date(2026, 0, 5, 9, 3, 7); // 2026-01-05 09:03:07
    expect(formatTimestamp(d)).toBe("20260105-090307");
  });

  it("年末跨年", () => {
    const d = new Date(2026, 11, 31, 23, 59, 59);
    expect(formatTimestamp(d)).toBe("20261231-235959");
  });
});

describe("buildSelectionMarkdownFile", () => {
  beforeEach(() => {
    // 固定时间戳，让文件名可断言
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 13, 14, 14, 0));
  });

  it("文件名格式：{清洗后 title}-{yyyymmdd-HHMMSS}.md", async () => {
    const file = buildSelectionMarkdownFile({
      selectedText: "正文内容",
      pageUrl: "https://example.com/p",
      pageTitle: "我的:文章/标题",
      hostname: "example.com",
    });
    expect(file.name).toBe("我的文章标题-20260513-141400.md");
    expect(file.type).toBe("text/markdown");
  });

  it("title 为空 → fallback 用 hostname", () => {
    const file = buildSelectionMarkdownFile({
      selectedText: "x",
      pageUrl: "https://example.com",
      pageTitle: "",
      hostname: "example.com",
    });
    expect(file.name).toBe("example.com-20260513-141400.md");
  });

  it("title + hostname 都空 → fallback 'selection'", () => {
    const file = buildSelectionMarkdownFile({
      selectedText: "x",
      pageUrl: "",
      pageTitle: "",
      hostname: "",
    });
    expect(file.name).toBe("selection-20260513-141400.md");
  });

  it("md 内容首行是「来自 🌐 [title](url)」", async () => {
    const file = buildSelectionMarkdownFile({
      selectedText: "正文",
      pageUrl: "https://example.com/p",
      pageTitle: "页面标题",
      hostname: "example.com",
    });
    const text = await file.text();
    expect(text.split("\n")[0]).toBe(
      "来自 🌐 [页面标题](https://example.com/p)"
    );
    expect(text).toContain("---");
    expect(text).toContain("正文");
  });

  it("没有 pageUrl 时不带 markdown 链接", async () => {
    const file = buildSelectionMarkdownFile({
      selectedText: "正文",
      pageUrl: "",
      pageTitle: "标题",
      hostname: "",
    });
    const text = await file.text();
    expect(text.split("\n")[0]).toBe("来自 🌐 标题");
  });

  it("md 内容包含完整 selectedText（不截断）", async () => {
    const long = "这段很长的内容".repeat(200); // 1400 字
    const file = buildSelectionMarkdownFile({
      selectedText: long,
      pageUrl: "https://x.com",
      pageTitle: "t",
      hostname: "x.com",
    });
    const text = await file.text();
    expect(text).toContain(long);
  });
});
