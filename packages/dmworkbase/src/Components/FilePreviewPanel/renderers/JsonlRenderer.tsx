import React, { useState, useMemo, useCallback } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { BaseRendererProps } from "../types";
import { useFileContent } from "../hooks/useFileContent";
import {
  ViewMode,
  ColumnConfig,
  parseJsonl,
  formatJsonl,
  renderCellContent,
  extractColumns,
  countJsonlLines,
  codeTheme,
  codeDarkTheme,
  getLineNumberStyle,
  getCodeCustomStyle,
  codeTagStyle,
} from "./json-utils";
import "./JsonlRenderer.css";

export interface JsonlRendererProps extends BaseRendererProps {}

/**
 * JSONL 渲染器
 * 支持代码视图（格式化 JSONL）和表格视图
 * JSONL 格式：每行是一个独立的 JSON 对象
 */
const JsonlRenderer: React.FC<JsonlRendererProps> = ({ file, onError }) => {
  const { content, loading, error, reload } = useFileContent({
    url: file.url,
  });

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(0);
  const pageSize = 100;

  // 检测当前主题模式
  const isDarkMode =
    typeof document !== "undefined" &&
    document.body.getAttribute("theme-mode") === "dark";

  // 解析 JSONL 数据
  const tableData = useMemo(() => {
    if (!content) return [];
    return parseJsonl(content);
  }, [content]);

  // 格式化的 JSONL 字符串
  const formattedJsonl = useMemo(() => {
    if (!content) return "";
    return formatJsonl(content);
  }, [content]);

  // 获取表格列配置
  const columns: ColumnConfig[] = useMemo(() => {
    return extractColumns(tableData);
  }, [tableData]);

  // 统计信息
  const lineCount = useMemo(() => {
    return countJsonlLines(content || "");
  }, [content]);

  // 分页数据
  const totalPages = Math.ceil(tableData.length / pageSize);
  const startRow = page * pageSize;
  const endRow = Math.min(startRow + pageSize, tableData.length);
  const visibleRows = tableData.slice(startRow, endRow);

  // 切换视图时重置分页
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setPage(0);
  }, []);

  // 判断是否可以显示表格视图
  const canShowTable = tableData.length > 0 && columns.length > 0;

  if (loading) {
    return (
      <div className="wk-file-preview-jsonl-renderer wk-file-preview-jsonl-renderer--loading">
        <div className="wk-file-preview-jsonl-renderer__spinner" />
        <span>加载中...</span>
      </div>
    );
  }

  if (error) {
    onError?.(error);
    return (
      <div className="wk-file-preview-jsonl-renderer wk-file-preview-jsonl-renderer--error">
        <span>{error}</span>
        <button
          className="wk-file-preview-jsonl-renderer__retry"
          onClick={reload}
        >
          重试
        </button>
      </div>
    );
  }

  if (content === null || tableData.length === 0) {
    return (
      <div className="wk-file-preview-jsonl-renderer wk-file-preview-jsonl-renderer--empty">
        <span>暂无内容或 JSONL 格式错误</span>
      </div>
    );
  }

  return (
    <div className="wk-file-preview-jsonl-renderer">
      {/* 工具栏 */}
      <div className="wk-file-preview-jsonl-renderer__toolbar">
        <div className="wk-file-preview-jsonl-renderer__info">
          <span className="wk-file-preview-jsonl-renderer__badge">JSONL</span>
          <span className="wk-file-preview-jsonl-renderer__stats">
            {lineCount} 行 · {tableData.length} 条有效记录
          </span>
        </div>
        <div className="wk-file-preview-jsonl-renderer__view-switcher">
          <button
            className={`wk-file-preview-jsonl-renderer__view-btn ${
              viewMode === "table"
                ? "wk-file-preview-jsonl-renderer__view-btn--active"
                : ""
            }`}
            onClick={() => handleViewModeChange("table")}
            disabled={!canShowTable}
            title={canShowTable ? "表格视图" : "无法提取表格数据"}
          >
            <svg
              className="wk-file-preview-jsonl-renderer__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
            <span>表格</span>
          </button>
          <button
            className={`wk-file-preview-jsonl-renderer__view-btn ${
              viewMode === "code"
                ? "wk-file-preview-jsonl-renderer__view-btn--active"
                : ""
            }`}
            onClick={() => handleViewModeChange("code")}
            title="代码视图"
          >
            <svg
              className="wk-file-preview-jsonl-renderer__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>代码</span>
          </button>
        </div>
      </div>

      {/* 表格视图 */}
      {viewMode === "table" && canShowTable && (
        <>
          <div className="wk-file-preview-jsonl-renderer__table-wrapper">
            <table className="wk-file-preview-jsonl-renderer__table">
              <thead>
                <tr>
                  <th className="wk-file-preview-jsonl-renderer__row-num">#</th>
                  {columns.map((col) => (
                    <th key={col.key} title={col.title}>
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, rowIdx) => (
                  <tr key={startRow + rowIdx}>
                    <td className="wk-file-preview-jsonl-renderer__row-num">
                      {startRow + rowIdx + 1}
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} title={renderCellContent(row[col.key])}>
                        {renderCellContent(row[col.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {tableData.length > pageSize && (
            <div className="wk-file-preview-jsonl-renderer__pagination">
              <span className="wk-file-preview-jsonl-renderer__page-info">
                显示 {startRow + 1}-{endRow} 行，共 {tableData.length} 行
              </span>
              <div className="wk-file-preview-jsonl-renderer__page-controls">
                <button
                  className="wk-file-preview-jsonl-renderer__page-btn"
                  disabled={page === 0}
                  onClick={() => setPage(0)}
                >
                  首页
                </button>
                <button
                  className="wk-file-preview-jsonl-renderer__page-btn"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </button>
                <span className="wk-file-preview-jsonl-renderer__page-current">
                  {page + 1} / {totalPages}
                </span>
                <button
                  className="wk-file-preview-jsonl-renderer__page-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </button>
                <button
                  className="wk-file-preview-jsonl-renderer__page-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(totalPages - 1)}
                >
                  末页
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 代码视图 */}
      {viewMode === "code" && (
        <div className="wk-file-preview-jsonl-renderer__code-container">
          <SyntaxHighlighter
            language="json"
            style={(isDarkMode ? codeDarkTheme : codeTheme) as any}
            showLineNumbers
            lineNumberStyle={getLineNumberStyle(isDarkMode)}
            customStyle={getCodeCustomStyle(isDarkMode)}
            codeTagProps={{ style: codeTagStyle }}
          >
            {formattedJsonl}
          </SyntaxHighlighter>
        </div>
      )}

      {/* 表格视图不可用时的提示 */}
      {viewMode === "table" && !canShowTable && (
        <div className="wk-file-preview-jsonl-renderer__empty">
          <span>无法从 JSONL 数据中提取表格结构</span>
          <button
            className="wk-file-preview-jsonl-renderer__switch-btn"
            onClick={() => handleViewModeChange("code")}
          >
            切换到代码视图
          </button>
        </div>
      )}
    </div>
  );
};

export default JsonlRenderer;
export { JsonlRenderer };
