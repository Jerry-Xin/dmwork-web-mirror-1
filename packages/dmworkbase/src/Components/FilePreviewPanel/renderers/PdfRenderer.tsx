import React, { useState } from "react";
import {
  Viewer,
  Worker,
  PageChangeEvent,
  DocumentLoadEvent,
  SpecialZoomLevel,
} from "@react-pdf-viewer/core";
import { thumbnailPlugin } from "@react-pdf-viewer/thumbnail";
import {
  zoomPlugin,
  RenderZoomInProps,
  RenderZoomOutProps,
} from "@react-pdf-viewer/zoom";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { BaseRendererProps } from "../types";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/thumbnail/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import "./PdfRenderer.css";

export interface PdfRendererProps extends BaseRendererProps {}

// 缩放选项
const ZOOM_OPTIONS = [
  { label: "适应页面", value: "PageFit" },
  { label: "适应宽度", value: "PageWidth" },
  { label: "实际大小", value: "ActualSize" },
  { label: "75%", value: "0.75" },
  { label: "100%", value: "1" },
  { label: "125%", value: "1.25" },
  { label: "150%", value: "1.5" },
  { label: "200%", value: "2" },
  { label: "300%", value: "3" },
];

/**
 * PDF 渲染器
 * 使用 @react-pdf-viewer 实现，支持缩略图、缩放、翻页等功能
 */
const PdfRenderer: React.FC<PdfRendererProps> = ({ file, onError }) => {
  // 缩略图折叠状态
  const [isThumbnailCollapsed, setIsThumbnailCollapsed] = useState(true);
  // 当前页面状态
  const [currentPage, setCurrentPage] = useState(0);
  // 总页数状态
  const [totalPages, setTotalPages] = useState<number | null>(null);
  // 当前缩放比例状态
  const [currentScale, setCurrentScale] = useState(1);
  // 当前缩放模式（数值或特殊级别）
  const [currentZoomMode, setCurrentZoomMode] = useState<string>("PageFit");
  // 页码输入框的值
  const [pageInputValue, setPageInputValue] = useState<string>("1");
  // 加载状态
  const [isLoading, setIsLoading] = useState(true);

  // 创建缩略图插件（侧边预览）
  const thumbnailPluginInstance = thumbnailPlugin();
  const { Thumbnails } = thumbnailPluginInstance;

  // 创建缩放插件（放大缩小、调整百分比）
  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn: ZoomInButton, ZoomOut: ZoomOutButton } = zoomPluginInstance;

  // 创建页面导航插件（上下翻页、页码展示跳页）
  const pageNavigationPluginInstance = pageNavigationPlugin();
  const { GoToNextPage, GoToPreviousPage, jumpToPage } =
    pageNavigationPluginInstance;

  // 文档加载完成监听器
  const handleDocumentLoad = (e: DocumentLoadEvent) => {
    setTotalPages(e.doc.numPages);
    setIsLoading(false);
  };

  // 页面变化监听器
  const handlePageChange = (e: PageChangeEvent) => {
    setCurrentPage(e.currentPage);
    setPageInputValue(String(e.currentPage + 1));
  };

  // 处理缩放模式变化
  const handleZoomChange = (value: string) => {
    if (
      value === "PageFit" ||
      value === "PageWidth" ||
      value === "ActualSize"
    ) {
      const specialLevel =
        SpecialZoomLevel[value as keyof typeof SpecialZoomLevel];
      zoomPluginInstance.zoomTo(specialLevel);
      setCurrentZoomMode(value);
    } else {
      const scale = parseFloat(value);
      zoomPluginInstance.zoomTo(scale);
      setCurrentScale(scale);
      setCurrentZoomMode(value);
    }
  };

  // 处理页码输入框变化
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  // 处理页码输入框回车键
  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const pageNumber = parseInt(pageInputValue, 10);
      if (
        !isNaN(pageNumber) &&
        pageNumber >= 1 &&
        totalPages &&
        pageNumber <= totalPages
      ) {
        jumpToPage(pageNumber - 1);
      } else {
        setPageInputValue(String(currentPage + 1));
      }
    }
  };

  // 处理输入框失去焦点
  const handlePageInputBlur = () => {
    const pageNumber = parseInt(pageInputValue, 10);
    if (
      !isNaN(pageNumber) &&
      pageNumber >= 1 &&
      totalPages &&
      pageNumber <= totalPages
    ) {
      jumpToPage(pageNumber - 1);
    } else {
      setPageInputValue(String(currentPage + 1));
    }
  };

  // 获取当前缩放显示文本
  const getZoomDisplayText = () => {
    if (currentZoomMode === "PageFit") return "适应页面";
    if (currentZoomMode === "PageWidth") return "适应宽度";
    if (currentZoomMode === "ActualSize") return "实际大小";
    return `${Math.round(currentScale * 100)}%`;
  };

  // 处理加载错误
  const handleLoadError = (error: Error) => {
    setIsLoading(false);
    onError?.(`PDF 加载失败: ${error.message}`);
  };

  // PDF Worker URL - 使用 jsdelivr CDN（国内访问更快）
  const workerUrl =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

  if (!file.url) {
    return (
      <div className="wk-file-preview-pdf-renderer__error">
        <span>无法加载 PDF 文件</span>
      </div>
    );
  }

  return (
    <Worker workerUrl={workerUrl}>
      <div className="wk-file-preview-pdf-renderer">
        {/* 工具栏 */}
        <div className="wk-file-preview-pdf-renderer__toolbar">
          {/* 缩略图切换按钮 */}
          <button
            className="wk-file-preview-pdf-renderer__toolbar-btn"
            onClick={() => setIsThumbnailCollapsed(!isThumbnailCollapsed)}
            title={isThumbnailCollapsed ? "显示缩略图" : "隐藏缩略图"}
          >
            {isThumbnailCollapsed ? (
              <PanelLeft size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>

          <div className="wk-file-preview-pdf-renderer__toolbar-divider" />

          {/* 缩放控制 */}
          <ZoomOutButton>
            {(props: RenderZoomOutProps) => (
              <button
                className="wk-file-preview-pdf-renderer__toolbar-btn"
                onClick={props.onClick}
                title="缩小"
              >
                <ZoomOut size={18} />
              </button>
            )}
          </ZoomOutButton>

          <ZoomInButton>
            {(props: RenderZoomInProps) => (
              <button
                className="wk-file-preview-pdf-renderer__toolbar-btn"
                onClick={props.onClick}
                title="放大"
              >
                <ZoomIn size={18} />
              </button>
            )}
          </ZoomInButton>

          <select
            className="wk-file-preview-pdf-renderer__zoom-select"
            value={currentZoomMode}
            onChange={(e) => handleZoomChange(e.target.value)}
          >
            {ZOOM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="wk-file-preview-pdf-renderer__toolbar-divider" />

          {/* 页面导航 */}
          <GoToPreviousPage>
            {(props) => (
              <button
                className={`wk-file-preview-pdf-renderer__toolbar-btn ${
                  props.isDisabled
                    ? "wk-file-preview-pdf-renderer__toolbar-btn--disabled"
                    : ""
                }`}
                onClick={props.isDisabled ? undefined : props.onClick}
                title="上一页"
                disabled={props.isDisabled}
              >
                <ChevronLeft size={18} />
              </button>
            )}
          </GoToPreviousPage>

          <GoToNextPage>
            {(props) => (
              <button
                className={`wk-file-preview-pdf-renderer__toolbar-btn ${
                  props.isDisabled
                    ? "wk-file-preview-pdf-renderer__toolbar-btn--disabled"
                    : ""
                }`}
                onClick={props.isDisabled ? undefined : props.onClick}
                title="下一页"
                disabled={props.isDisabled}
              >
                <ChevronRight size={18} />
              </button>
            )}
          </GoToNextPage>

          <div className="wk-file-preview-pdf-renderer__page-nav">
            <input
              type="text"
              className="wk-file-preview-pdf-renderer__page-input"
              value={pageInputValue}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputKeyDown}
              onBlur={handlePageInputBlur}
              title="跳转到页面"
            />
            <span className="wk-file-preview-pdf-renderer__page-total">
              / {totalPages || "-"}
            </span>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="wk-file-preview-pdf-renderer__content">
          {/* 缩略图侧边栏 */}
          {!isThumbnailCollapsed && (
            <div className="wk-file-preview-pdf-renderer__thumbnails">
              <Thumbnails />
            </div>
          )}

          {/* PDF 查看器 */}
          <div className="wk-file-preview-pdf-renderer__viewer">
            {isLoading && (
              <div className="wk-file-preview-pdf-renderer__loading">
                <div className="wk-file-preview-pdf-renderer__spinner" />
                <span>加载中...</span>
              </div>
            )}
            <Viewer
              fileUrl={file.url}
              plugins={[
                thumbnailPluginInstance,
                zoomPluginInstance,
                pageNavigationPluginInstance,
              ]}
              onDocumentLoad={handleDocumentLoad}
              onPageChange={handlePageChange}
              defaultScale={SpecialZoomLevel.PageFit}
              characterMap={{
                url: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
                isCompressed: true,
              }}
              renderError={(error) => (
                <div className="wk-file-preview-pdf-renderer__error">
                  <span>PDF 加载失败</span>
                  <span className="wk-file-preview-pdf-renderer__error-detail">
                    {error.message || "请检查文件是否有效"}
                  </span>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </Worker>
  );
};

export default PdfRenderer;
export { PdfRenderer };
