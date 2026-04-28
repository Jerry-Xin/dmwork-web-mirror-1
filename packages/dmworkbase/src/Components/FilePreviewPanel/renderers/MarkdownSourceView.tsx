import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import "./MarkdownSourceView.css";
import "./code-highlight.css";

export interface MarkdownSourceViewProps {
  /** Markdown 源码内容 */
  content: string;
}

/**
 * Markdown 源码视图组件
 *
 * 功能：
 * 1. 使用 react-syntax-highlighter 进行 Markdown 语法高亮
 * 2. 显示行号
 * 3. 等宽字体展示
 */
const MarkdownSourceView: React.FC<MarkdownSourceViewProps> = ({ content }) => {
  if (!content || content.trim() === "") {
    return (
      <div className="wk-markdown-source-view wk-markdown-source-view--empty">
        <span className="wk-markdown-source-view__message">暂无内容</span>
      </div>
    );
  }

  return (
    <div className="wk-markdown-source-view wk-code-highlight-container">
      <SyntaxHighlighter
        language="markdown"
        useInlineStyles={false}
        showLineNumbers
        wrapLines
        lineNumberStyle={{
          minWidth: "3em",
          paddingRight: "1em",
          textAlign: "right",
          userSelect: "none",
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

export default MarkdownSourceView;
export { MarkdownSourceView };
