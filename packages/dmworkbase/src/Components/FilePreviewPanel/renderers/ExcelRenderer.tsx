import React, { useState, useEffect, useCallback, useRef } from "react";
import { BaseRendererProps } from "../types";
import "./ExcelRenderer.css";

export interface ExcelRendererProps extends BaseRendererProps {}

// 动态加载 xlsx 库
let xlsxLibrary: typeof import("xlsx") | null = null;

async function loadXlsxLibrary(): Promise<typeof import("xlsx")> {
  if (xlsxLibrary) return xlsxLibrary;

  // 本地开发时使用动态导入
  try {
    xlsxLibrary = await import("xlsx");
    return xlsxLibrary;
  } catch {
    // 如果动态导入失败，尝试从 window 获取
    xlsxLibrary = (window as any).XLSX;
    if (xlsxLibrary) return xlsxLibrary;
    throw new Error("xlsx library not available");
  }
}

interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
  maxCols: number;
}

/**
 * Excel 渲染器
 * 支持 xlsx, xls, csv 格式的表格预览
 */
const ExcelRenderer: React.FC<ExcelRendererProps> = ({ file, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageSize = 100; // 每页行数

  const loadContent = useCallback(async () => {
    if (!file.url) return;

    setLoading(true);
    setError(null);
    setSheets([]);
    setActiveSheet(0);
    setPage(0);

    try {
      const XLSX = await loadXlsxLibrary();

      // 判断文件类型
      const ext = file.extension?.toLowerCase() || "";
      const isExcel = ["xlsx", "xls", "xlsb", "xlsm"].includes(ext);

      if (ext === "csv") {
        // CSV 文件：作为文本加载
        const response = await fetch(file.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const text = await response.text();

        // 简单的 CSV 解析
        const rows: string[][] = [];
        const lines = text.split(/\r?\n/);

        for (const line of lines) {
          const cells: string[] = [];
          let current = "";
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              cells.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          cells.push(current.trim());

          if (cells.some((c) => c !== "")) {
            rows.push(cells);
          }
        }

        if (rows.length === 0) {
          throw new Error("CSV 文件为空");
        }

        const headers = rows[0] || [];
        const csvData: SheetData = {
          name: file.name || "Sheet1",
          headers,
          rows: rows.slice(1),
          maxCols: headers.length,
        };

        setSheets([csvData]);
        setLoading(false);
        return;
      }

      if (!isExcel) {
        throw new Error("不支持的文件格式");
      }

      // Excel 文件：作为二进制加载
      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });

      // 解析所有工作表
      const parsedSheets: SheetData[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          defval: "",
        }) as string[][];

        if (jsonData.length > 0) {
          const headers = jsonData[0] || [];
          const rows = jsonData
            .slice(1)
            .filter((row) =>
              row.some(
                (cell) => cell !== "" && cell !== null && cell !== undefined
              )
            );

          parsedSheets.push({
            name: sheetName,
            headers,
            rows,
            maxCols: Math.max(headers.length, ...rows.map((r) => r.length)),
          });
        }
      });

      if (parsedSheets.length === 0) {
        throw new Error("工作表为空");
      }

      setSheets(parsedSheets);
      setTotalPages(Math.ceil((parsedSheets[0]?.rows.length || 0) / pageSize));
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [file.url, file.extension, file.name, onError]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const reload = useCallback(() => {
    loadContent();
  }, [loadContent]);

  // 分页
  useEffect(() => {
    if (sheets.length > 0 && activeSheet < sheets.length) {
      const sheet = sheets[activeSheet];
      setTotalPages(Math.ceil(sheet.rows.length / pageSize));
      setPage(0);
    }
  }, [sheets, activeSheet]);

  if (loading) {
    return (
      <div className="wk-file-preview-excel-renderer wk-file-preview-excel-renderer--loading">
        <div className="wk-file-preview-excel-renderer__spinner" />
        <span>加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wk-file-preview-excel-renderer wk-file-preview-excel-renderer--error">
        <span>{error}</span>
        <button
          className="wk-file-preview-excel-renderer__retry"
          onClick={reload}
        >
          重试
        </button>
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="wk-file-preview-excel-renderer wk-file-preview-excel-renderer--empty">
        <span>暂无内容</span>
      </div>
    );
  }

  const currentSheet = sheets[activeSheet];
  const startRow = page * pageSize;
  const endRow = Math.min(startRow + pageSize, currentSheet.rows.length);
  const visibleRows = currentSheet.rows.slice(startRow, endRow);

  return (
    <div className="wk-file-preview-excel-renderer" ref={containerRef}>
      {/* 工作表切换器 */}
      {sheets.length > 1 && (
        <div className="wk-file-preview-excel-renderer__tabs">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              className={`wk-file-preview-excel-renderer__tab ${
                index === activeSheet
                  ? "wk-file-preview-excel-renderer__tab--active"
                  : ""
              }`}
              onClick={() => setActiveSheet(index)}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* 表格容器 */}
      <div className="wk-file-preview-excel-renderer__table-wrapper">
        <table className="wk-file-preview-excel-renderer__table">
          <thead>
            <tr>
              <th className="wk-file-preview-excel-renderer__row-num">#</th>
              {currentSheet.headers.map((header, idx) => (
                <th key={idx}>{header || `列 ${idx + 1}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIdx) => (
              <tr key={startRow + rowIdx}>
                <td className="wk-file-preview-excel-renderer__row-num">
                  {startRow + rowIdx + 1}
                </td>
                {currentSheet.headers.map((_, colIdx) => (
                  <td key={colIdx}>
                    {row[colIdx] !== undefined && row[colIdx] !== null
                      ? String(row[colIdx])
                      : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {currentSheet.rows.length > pageSize && (
        <div className="wk-file-preview-excel-renderer__pagination">
          <span className="wk-file-preview-excel-renderer__page-info">
            显示 {startRow + 1}-{endRow} 行，共 {currentSheet.rows.length} 行
          </span>
          <div className="wk-file-preview-excel-renderer__page-controls">
            <button
              className="wk-file-preview-excel-renderer__page-btn"
              disabled={page === 0}
              onClick={() => setPage(0)}
            >
              首页
            </button>
            <button
              className="wk-file-preview-excel-renderer__page-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </button>
            <span className="wk-file-preview-excel-renderer__page-current">
              {page + 1} / {totalPages}
            </span>
            <button
              className="wk-file-preview-excel-renderer__page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </button>
            <button
              className="wk-file-preview-excel-renderer__page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(totalPages - 1)}
            >
              末页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelRenderer;
export { ExcelRenderer };
