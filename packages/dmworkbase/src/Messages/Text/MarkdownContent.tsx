import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import "./markdown.css";

interface MarkdownContentProps {
    content: string;
    isSend?: boolean;
    isStreaming?: boolean;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, isSend, isStreaming }) => {
    return (
        <div className={`wk-markdown ${isSend ? "wk-markdown-send" : "wk-markdown-recv"}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    // 链接在新标签页打开
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                            {children}
                        </a>
                    ),
                    // 代码块：带复制按钮
                    pre: ({ children }) => (
                        <div className="wk-markdown-pre-wrapper">
                            <pre>{children}</pre>
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
