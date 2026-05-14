import { formatMentionTextV2 } from "@dmwork/base/src/Components/MessageInput";

export interface PanelContext {
  selectedText: string;
  pageUrl: string;
  pageTitle: string;
  hostname: string;
}

/**
 * 拼装 cmdk 划词消息正文。
 * - 默认：含「> 来自 [title](url) > 选段」引用块 + 用户输入
 * - skipQuotedBody=true：长文本走 .md 文件 + 引用消息时使用，正文只剩用户输入
 *   （来源信息和选段全文都已写入 .md 文件）
 */
export function buildCmdkMessageText(
  text: string,
  context: PanelContext | null,
  opts?: { skipQuotedBody?: boolean }
): { content: string; mention?: any } {
  const skipQuotedBody = opts?.skipQuotedBody === true;
  const parts: string[] = [];
  const quotedText = context?.selectedText;
  const trimmedText = text.trim();

  if (!skipQuotedBody) {
    if (context?.pageUrl) {
      const label = context.pageTitle || context.pageUrl;
      const sourceLine = `来自 🌐 [${label}](${context.pageUrl})`;
      if (quotedText) {
        parts.push(
          `> ${sourceLine}\n> \n> ${quotedText.split("\n").join("\n> ")}`
        );
      } else {
        parts.push(`> ${sourceLine}`);
      }
    } else if (quotedText) {
      parts.push(`> ${quotedText.split("\n").join("\n> ")}`);
    }
  }

  if (trimmedText) {
    parts.push(trimmedText);
  }

  return formatMentionTextV2(parts.join("\n\n"));
}
