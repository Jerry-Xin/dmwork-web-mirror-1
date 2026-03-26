import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "highlight.js/styles/github-dark.css";
import "./markdown.css";

export interface MentionInfo {
    name: string; // "@张三"（含@符号）
    uid: string;
}

export interface EmojiInfo {
    key: string;  // emoji 文本 key，如 "[有品位]" 或 Unicode "😀"
    url: string;  // 图片 URL
}

interface MarkdownContentProps {
    content: string;
    isSend?: boolean;
    isStreaming?: boolean;
    mentions?: MentionInfo[];
    onMentionClick?: (uid: string) => void;
    emojis?: EmojiInfo[];
}

/**
 * 在 GitHub 默认白名单基础上，追加 highlight.js 需要的 class 属性。
 * 执行顺序：rehypeHighlight 先着色（加 hljs-* className），
 * rehypeSanitize 最后兜底清洗——白名单里的 hljs-* / language-* 才真正生效。
 * 注意：react-markdown 的输入是 Markdown 字符串，remark 直接解析成安全 AST，
 * 不存在注入 HTML 的机会（未开启 allowDangerousHtml），所以 highlight 先跑不会引入风险。
 */
const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        // 放行代码块的 language-* class（highlight.js 加的）
        code: [
            ...(defaultSchema.attributes?.code ?? []),
            ["className", /^language-/, /^hljs/],
        ],
        // 放行 span 上的 hljs-* class（语法高亮 token）
        span: [
            ...(defaultSchema.attributes?.span ?? []),
            ["className", /^hljs/],
        ],
    },
};

const rehypePlugins: any[] = [
    [rehypeHighlight, { aliases: { json5: "json" }, ignoreMissing: true }],
    [rehypeSanitize, sanitizeSchema],
];

const remarkPlugins: any[] = [remarkGfm];

/**
 * 预处理 Markdown 内容：
 * 把独占一行的 --- / === 补充前后空行，避免被解析成 setext 标题（h2/h1）。
 * 跳过 fenced code block（```...```）内的内容，避免误处理 YAML 等代码中的分隔线。
 */
function normalizeContent(raw: string): string {
    // 把字符串按 fenced code block 切分：
    // 奇数索引 = 代码块内容（保持原样），偶数索引 = 普通文本（需要处理）
    const parts = raw.split(/(```[\s\S]*?```)/g);
    const processed = parts.map((part, i) => {
        if (i % 2 === 1) return part;
        return part
            .replace(/([^\n])\n([-*_]{3,})\n/g, "$1\n\n$2\n\n")
            .replace(/(^|\n)([-*_]{3,})(\n|$)/g, "\n\n$2\n\n")
            .replace(/\n{3,}/g, "\n\n");
    });
    return processed.join("").trim();
}

type Segment =
    | { type: "text"; content: string }
    | { type: "mention"; name: string; uid: string }
    | { type: "emoji"; key: string; url: string };

function segmentText(
    text: string,
    mentions: MentionInfo[],
    emojis: EmojiInfo[],
): Segment[] {
    if (!mentions.length && !emojis.length) {
        return [{ type: "text", content: text }];
    }

    // 合并 mention 和 emoji，按 key/name 长度降序排列（防止短 key 提前匹配）
    type Token =
        | { kind: "mention"; name: string; uid: string }
        | { kind: "emoji"; key: string; url: string };

    const tokens: Token[] = [
        ...mentions.map((m) => ({ kind: "mention" as const, name: m.name, uid: m.uid })),
        ...emojis.map((e) => ({ kind: "emoji" as const, key: e.key, url: e.url })),
    ].sort((a, b) => {
        const aLen = a.kind === "mention" ? a.name.length : a.key.length;
        const bLen = b.kind === "mention" ? b.name.length : b.key.length;
        return bLen - aLen;
    });

    const escaped = tokens.map((t) => {
        const raw = t.kind === "mention" ? t.name : t.key;
        return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });

    const regex = new RegExp(`(${escaped.join("|")})`, "g");

    const segments: Segment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
        }
        const matched = match[0];
        const token = tokens.find((t) =>
            t.kind === "mention" ? t.name === matched : t.key === matched
        )!;
        if (token.kind === "mention") {
            segments.push({ type: "mention", name: token.name, uid: token.uid });
        } else {
            segments.push({ type: "emoji", key: token.key, url: token.url });
        }
        lastIndex = match.index + matched.length;
    }
    if (lastIndex < text.length) {
        segments.push({ type: "text", content: text.slice(lastIndex) });
    }
    return segments;
}

const baseComponents: any = {
    a: ({ href, children, ...props }: any) => (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
        </a>
    ),
    pre: ({ children, ...props }: any) => (
        <div className="wk-markdown-pre-wrapper">
            <pre {...props}>{children}</pre>
        </div>
    ),
};

/**
 * 单段文本的 inline ReactMarkdown 渲染器。
 * mention/emoji 把整段文本切成多段，每段单独送给 ReactMarkdown。
 * 这些小段通常是行内文本（不含标题/列表等块级结构），
 * 用 p → span 避免 <p> 造成的块级换行，保持与周围 mention/emoji span 同行。
 */
const InlineMarkdown: React.FC<{ content: string }> = ({ content }) => {
    // 如果内容包含块级结构（换行、标题、列表等），退回普通块级渲染
    const isInline = !content.includes("\n");
    const components = isInline
        ? { ...baseComponents, p: ({ children }: any) => <span>{children}</span> }
        : baseComponents;
    return (
        <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={components}
        >
            {content}
        </ReactMarkdown>
    );
};

const MarkdownContent: React.FC<MarkdownContentProps> = ({
    content,
    isSend = false,
    isStreaming,
    mentions = [],
    onMentionClick,
    emojis = [],
}) => {
    const normalized = useMemo(() => normalizeContent(content), [content]);

    // 无 mention 也无 emoji：整体走一个 ReactMarkdown
    if (!mentions.length && !emojis.length) {
        return (
            <div className={`wk-markdown ${isSend ? "wk-markdown-send" : "wk-markdown-recv"}`}>
                <ReactMarkdown
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                    components={baseComponents}
                >
                    {normalized}
                </ReactMarkdown>
                {isStreaming && <span className="wk-stream-cursor" />}
            </div>
        );
    }

    // 有 mention 或 emoji：切段渲染
    const segments = segmentText(normalized, mentions, emojis);

    return (
        <div className={`wk-markdown ${isSend ? "wk-markdown-send" : "wk-markdown-recv"}`}>
            {segments.map((seg, i) => {
                if (seg.type === "mention") {
                    return (
                        <span
                            key={i}
                            className={`wk-message-mention ${isSend ? "wk-message-mention-send" : "wk-message-mention-recv"}`}
                            onClick={() => seg.uid && onMentionClick?.(seg.uid)}
                        >
                            {seg.name}
                        </span>
                    );
                }
                if (seg.type === "emoji") {
                    return (
                        <span key={i} className="wk-message-text-richemoji">
                            <img alt={seg.key} src={seg.url} />
                        </span>
                    );
                }
                return <InlineMarkdown key={i} content={seg.content} />;
            })}
            {isStreaming && <span className="wk-stream-cursor" />}
        </div>
    );
};

export default MarkdownContent;
