import React from "react";
import { BaseRendererProps } from "../types";
import { useFileContent } from "../hooks/useFileContent";
import "./TextRenderer.css";

export interface TextRendererProps extends BaseRendererProps {}

/**
 * 纯文本渲染器
 * 支持 txt, log, ini, conf, cfg 格式
 */
const TextRenderer: React.FC<TextRendererProps> = ({ file, onError }) => {
  const { content, loading, error, reload } = useFileContent({
    url: file.url,
  });

  if (loading) {
    return (
      <div className="wk-file-preview-text-renderer wk-file-preview-text-renderer--loading">
        <div className="wk-file-preview-text-renderer__spinner" />
        <span>加载中...</span>
      </div>
    );
  }

  if (error) {
    onError?.(error);
    return (
      <div className="wk-file-preview-text-renderer wk-file-preview-text-renderer--error">
        <span>{error}</span>
        <button
          className="wk-file-preview-text-renderer__retry"
          onClick={reload}
        >
          重试
        </button>
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="wk-file-preview-text-renderer wk-file-preview-text-renderer--empty">
        <span>暂无内容</span>
      </div>
    );
  }

  return (
    <div className="wk-file-preview-text-renderer">
      <div className="wk-file-preview-text-renderer__content">{content}</div>
    </div>
  );
};

export default TextRenderer;
export { TextRenderer };
