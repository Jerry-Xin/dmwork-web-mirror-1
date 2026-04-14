import React from "react";
import { BaseRendererProps } from "../types";
import { useFileContent } from "../hooks/useFileContent";
import MarkdownContent from "../../../Messages/Text/MarkdownContent";
import "./MarkdownRenderer.css";

export interface MarkdownRendererProps extends BaseRendererProps {}

/**
 * Markdown 渲染器
 * 支持 md, markdown 格式
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  file,
  onError,
}) => {
  const { content, loading, error, reload } = useFileContent({
    url: file.url,
  });

  if (loading) {
    return (
      <div className="wk-file-preview-markdown-renderer wk-file-preview-markdown-renderer--loading">
        <div className="wk-file-preview-markdown-renderer__spinner" />
        <span className="wk-file-preview-markdown-renderer__message">
          加载中...
        </span>
      </div>
    );
  }

  if (error) {
    onError?.(error);
    return (
      <div className="wk-file-preview-markdown-renderer wk-file-preview-markdown-renderer--error">
        <span className="wk-file-preview-markdown-renderer__message">
          {error}
        </span>
        <button
          className="wk-file-preview-markdown-renderer__retry"
          onClick={reload}
        >
          重试
        </button>
      </div>
    );
  }

  if (content === null || content.trim() === "") {
    return (
      <div className="wk-file-preview-markdown-renderer wk-file-preview-markdown-renderer--empty">
        <span className="wk-file-preview-markdown-renderer__message">
          暂无内容
        </span>
      </div>
    );
  }

  return (
    <div className="wk-file-preview-markdown-renderer">
      <div className="wk-file-preview-markdown-renderer__content">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
};

export default MarkdownRenderer;
export { MarkdownRenderer };
