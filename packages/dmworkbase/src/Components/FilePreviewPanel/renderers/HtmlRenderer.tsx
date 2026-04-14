import React, { useState, useRef, useEffect } from "react";
import { BaseRendererProps } from "../types";
import { useFileContent } from "../hooks/useFileContent";
import "./HtmlRenderer.css";

export interface HtmlRendererProps extends BaseRendererProps {}

/**
 * HTML 渲染器
 * 使用 iframe 渲染 HTML 文件，支持完整的 HTML 预览
 * 支持 html, htm 格式
 */
const HtmlRenderer: React.FC<HtmlRendererProps> = ({ file, onError }) => {
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 加载 HTML 内容
  const { content, loading: contentLoading, error, reload } = useFileContent({
    url: file.url,
  });

  // 当内容加载完成后，创建 Blob URL
  useEffect(() => {
    if (content) {
      const blob = new Blob([content], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [content]);

  // iframe 加载完成
  const handleIframeLoad = () => {
    setLoading(false);
  };

  // iframe 加载错误
  const handleIframeError = () => {
    setLoading(false);
    onError?.("HTML 加载失败");
  };

  if (contentLoading) {
    return (
      <div className="wk-file-preview-html-renderer wk-file-preview-html-renderer--loading">
        <div className="wk-file-preview-html-renderer__spinner" />
        <span className="wk-file-preview-html-renderer__message">加载中...</span>
      </div>
    );
  }

  if (error) {
    onError?.(error);
    return (
      <div className="wk-file-preview-html-renderer wk-file-preview-html-renderer--error">
        <span className="wk-file-preview-html-renderer__message">{error}</span>
        <button className="wk-file-preview-html-renderer__retry" onClick={reload}>
          重试
        </button>
      </div>
    );
  }

  if (!content || !blobUrl) {
    return (
      <div className="wk-file-preview-html-renderer wk-file-preview-html-renderer--empty">
        <span className="wk-file-preview-html-renderer__message">暂无内容</span>
      </div>
    );
  }

  return (
    <div className="wk-file-preview-html-renderer">
      {loading && (
        <div className="wk-file-preview-html-renderer__loading-overlay">
          <div className="wk-file-preview-html-renderer__spinner" />
          <span className="wk-file-preview-html-renderer__message">渲染中...</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={blobUrl}
        className={`wk-file-preview-html-renderer__iframe ${
          loading ? "wk-file-preview-html-renderer__iframe--hidden" : ""
        }`}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        sandbox="allow-scripts allow-same-origin"
        title={file.name}
      />
    </div>
  );
};

export default HtmlRenderer;
export { HtmlRenderer };
