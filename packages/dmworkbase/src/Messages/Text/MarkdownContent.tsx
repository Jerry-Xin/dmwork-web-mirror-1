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

interface MarkdownContentProps {
    content: string;
    isSend?: boolean;
    isStreaming?: boolean;
    mentions?: MentionInfo[];
    onMentionClick?: (uid: string) => void;
}

const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [
            ...(defaultSchema.attributes?.code ?? []),
            ["className", /^language-/, /^hljs/],
        ],
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

function normalizeContent(raw: string): string {
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
    | { type: "mention"; name: string; uid: string };

function segmentText(text: string, mentions: MentionInfo[]): Segment[] {
    if (!mentions.length) return [{ type: "text", content: text }];
    const sorted = [...mentions].sort((a, b) => b.name.length - a.name.length);
    const escaped = sorted.map((m) => m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escaped.join("|")})`, "g");

    const segments: Segment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
        }
        const mention = sorted.find((m) => m.name === match![0])!;
        segments.push({ type: "mention", name: mention.name, uid: mention.uid });
        lastIndex = match.index + match[0].length;
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
 * mention 把整段文本切成多段，每段单独送给 ReactMarkdown。
 * 这些小段通常是行内文本（不含标题/列表等块级结构），
 * 用 p → span 避免 <p> 造成的块级换行，保持与周围 mention span 同行。
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
}) => {
    const normalized = useMemo(() => normalizeContent(content), [content]);

    // 无 mention：整体走一个 ReactMarkdown
    if (!mentions.length) {
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

    // 有 mention：切段渲染
    const segments = segmentText(normalized, mentions);

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
                return <InlineMarkdown key={i} content={seg.content} />;
            })}
            {isStreaming && <span className="wk-stream-cursor" />}
        </div>
    );
};

export default MarkdownContent;
