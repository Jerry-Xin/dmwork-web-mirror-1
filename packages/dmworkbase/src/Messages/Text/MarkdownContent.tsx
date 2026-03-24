import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "highlight.js/styles/github-dark.css";
import "./markdown.css";

interface MarkdownContentProps {
    content: string;
    isSend?: boolean;
    isStreaming?: boolean;
}

/**
 * 在 GitHub 默认白名单基础上，追加 highlight.js 需要的 class 属性。
 * rehype-sanitize 默认会剥掉所有 class，但 rehype-highlight 靠 class 着色，
 * 所以需要显式放行 code/span 上的 class（只允许 hljs- 前缀或 language- 前缀）。
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

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, isSend, isStreaming }) => {
    return (
        <div className={`wk-markdown ${isSend ? "wk-markdown-send" : "wk-markdown-recv"}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                    // ⚠️ 顺序关键：sanitize 先清洗，highlight 再着色
                    [rehypeSanitize, sanitizeSchema],
                    rehypeHighlight,
                ]}
                components={{
                    a: ({ href, children, ...props }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                            {children}
                        </a>
                    ),
                    pre: ({ children, ...props }) => (
                        <div className="wk-markdown-pre-wrapper">
                            <pre {...props}>{children}</pre>
                        </div>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
            {isStreaming && <span className="wk-stream-cursor" />}
        </div>
    );
};

export default MarkdownContent;
