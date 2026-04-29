export interface CocraftParsedMessage {
  uagt: string;
  content: string;
  hasActions: boolean;
  rawMessage: string;
}

const COCRAFT_TAG_RE = /<cocraft[\s>]/i;
const TOOL_RESULTS_RE = /<cocraft[^>]*>\s*<tool_results>/i;

export function isCocraftToolResultMessage(text: string | undefined): boolean {
  if (!text) return false;
  return TOOL_RESULTS_RE.test(text);
}

export function parseCocraftMessage(
  text: string | undefined,
): CocraftParsedMessage | null {
  if (!text || !COCRAFT_TAG_RE.test(text)) return null;

  try {
    const wrapped = `<root>${text}</root>`;
    const doc = new DOMParser().parseFromString(wrapped, "text/xml");
    if (doc.querySelector("parsererror")) return null;

    const cocraftEl = doc.querySelector("cocraft");
    if (!cocraftEl) return null;

    const uagt = cocraftEl.getAttribute("uagt") || "";
    const contentEl = cocraftEl.querySelector("content");
    const content = contentEl?.textContent?.trim() || "";
    const hasActions = cocraftEl.querySelector("actions") !== null;

    return { uagt, content, hasActions, rawMessage: text };
  } catch {
    return null;
  }
}

export function getDisplayContent(text: string | undefined): string | null {
  if (!text) return text ?? null;
  if (isCocraftToolResultMessage(text)) return null;
  const parsed = parseCocraftMessage(text);
  if (parsed) return parsed.content;
  return text;
}
