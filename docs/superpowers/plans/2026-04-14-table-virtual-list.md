# Table Virtual List 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一个兼容 HTML `<table>` 结构的虚拟列表组件，支持定高行的高效渲染

**Architecture:** 
- 使用 spacer `<tr>` 元素代替绝对定位来维持滚动高度
- 只渲染可视区域内的行，通过顶部/底部占位行撑开滚动区域
- 监听滚动容器的 scroll 事件计算可见范围

**Tech Stack:** React, TypeScript

---

## 文件结构

```
packages/dmworkbase/src/Components/VirtualTable/
├── index.ts                    # 导出入口
├── VirtualTable.tsx            # 主组件
├── VirtualTable.css            # 样式
├── useVirtualScroll.ts         # 虚拟滚动核心 Hook
└── __tests__/
    └── VirtualTable.test.tsx   # 测试文件
```

## 核心设计

### 问题分析

现有 VirtualList 的问题：
1. 所有行都使用 `position: absolute; top: 0`，导致行重叠
2. 渲染 `<div>` 作为容器，放在 `<tbody>` 内违反 HTML 规范
3. `<tbody>` 只能包含 `<tr>` 元素

### 解决方案

使用「占位行」方案：
- 顶部放一个 `<tr>` 高度等于不可见的上方行总高度
- 中间渲染可见的 `<tr>` 行
- 底部放一个 `<tr>` 高度等于不可见的下方行总高度

```html
<table>
  <thead>...</thead>
  <tbody>
    <tr style="height: 400px"></tr>  <!-- 顶部占位 -->
    <tr>可见行1</tr>
    <tr>可见行2</tr>
    <tr>可见行3</tr>
    <tr style="height: 600px"></tr>  <!-- 底部占位 -->
  </tbody>
</table>
```

---

## Task 1: 创建 useVirtualScroll Hook

**Files:**
- Create: `packages/dmworkbase/src/Components/VirtualTable/useVirtualScroll.ts`
- Create: `packages/dmworkbase/src/Components/VirtualTable/__tests__/useVirtualScroll.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
// packages/dmworkbase/src/Components/VirtualTable/__tests__/useVirtualScroll.test.ts
import { renderHook, act } from "@testing-library/react";
import { useVirtualScroll } from "../useVirtualScroll";

describe("useVirtualScroll", () => {
  it("should calculate visible range for initial state", () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalCount: 100,
        rowHeight: 40,
        containerHeight: 400,
        scrollTop: 0,
        overscan: 3,
      })
    );

    // 400px / 40px = 10 visible rows, + 3 overscan bottom = 13
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(13);
    expect(result.current.topSpacerHeight).toBe(0);
    expect(result.current.bottomSpacerHeight).toBe((100 - 13) * 40);
  });

  it("should calculate visible range when scrolled", () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalCount: 100,
        rowHeight: 40,
        containerHeight: 400,
        scrollTop: 200, // 滚动了 200px = 5 行
        overscan: 3,
      })
    );

    // startIndex = 5 - 3 overscan = 2
    // endIndex = 5 + 10 + 3 = 18
    expect(result.current.startIndex).toBe(2);
    expect(result.current.endIndex).toBe(18);
    expect(result.current.topSpacerHeight).toBe(2 * 40);
    expect(result.current.bottomSpacerHeight).toBe((100 - 18) * 40);
  });

  it("should clamp indices to valid range", () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalCount: 10,
        rowHeight: 40,
        containerHeight: 400,
        scrollTop: 0,
        overscan: 3,
      })
    );

    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(10); // 不超过 totalCount
    expect(result.current.bottomSpacerHeight).toBe(0);
  });

  it("should handle empty list", () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalCount: 0,
        rowHeight: 40,
        containerHeight: 400,
        scrollTop: 0,
        overscan: 3,
      })
    );

    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(0);
    expect(result.current.topSpacerHeight).toBe(0);
    expect(result.current.bottomSpacerHeight).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/dmworkbase && pnpm test -- --testPathPattern="useVirtualScroll" --watch=false`
Expected: FAIL - 模块不存在

- [ ] **Step 3: 实现 useVirtualScroll Hook**

```typescript
// packages/dmworkbase/src/Components/VirtualTable/useVirtualScroll.ts
import { useMemo } from "react";

export interface UseVirtualScrollOptions {
  /** 总行数 */
  totalCount: number;
  /** 每行高度 (px) */
  rowHeight: number;
  /** 容器可视高度 (px) */
  containerHeight: number;
  /** 当前滚动位置 (px) */
  scrollTop: number;
  /** 上下额外渲染的行数，默认 3 */
  overscan?: number;
}

export interface VirtualScrollResult {
  /** 渲染起始索引 (包含) */
  startIndex: number;
  /** 渲染结束索引 (不包含) */
  endIndex: number;
  /** 顶部占位高度 (px) */
  topSpacerHeight: number;
  /** 底部占位高度 (px) */
  bottomSpacerHeight: number;
  /** 总高度 (px) */
  totalHeight: number;
}

export function useVirtualScroll({
  totalCount,
  rowHeight,
  containerHeight,
  scrollTop,
  overscan = 3,
}: UseVirtualScrollOptions): VirtualScrollResult {
  return useMemo(() => {
    if (totalCount === 0 || rowHeight === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        totalHeight: 0,
      };
    }

    const totalHeight = totalCount * rowHeight;

    // 计算可见行范围
    const visibleStartIndex = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.ceil(containerHeight / rowHeight);

    // 加上 overscan
    const startIndex = Math.max(0, visibleStartIndex - overscan);
    const endIndex = Math.min(totalCount, visibleStartIndex + visibleCount + overscan);

    // 计算占位高度
    const topSpacerHeight = startIndex * rowHeight;
    const bottomSpacerHeight = Math.max(0, (totalCount - endIndex) * rowHeight);

    return {
      startIndex,
      endIndex,
      topSpacerHeight,
      bottomSpacerHeight,
      totalHeight,
    };
  }, [totalCount, rowHeight, containerHeight, scrollTop, overscan]);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/dmworkbase && pnpm test -- --testPathPattern="useVirtualScroll" --watch=false`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add packages/dmworkbase/src/Components/VirtualTable/useVirtualScroll.ts packages/dmworkbase/src/Components/VirtualTable/__tests__/useVirtualScroll.test.ts
git commit -m "feat(VirtualTable): add useVirtualScroll hook for calculating visible range"
```

---

## Task 2: 创建 VirtualTable 组件

**Files:**
- Create: `packages/dmworkbase/src/Components/VirtualTable/VirtualTable.tsx`
- Create: `packages/dmworkbase/src/Components/VirtualTable/VirtualTable.css`
- Create: `packages/dmworkbase/src/Components/VirtualTable/__tests__/VirtualTable.test.tsx`

- [ ] **Step 1: 创建组件测试**

```typescript
// packages/dmworkbase/src/Components/VirtualTable/__tests__/VirtualTable.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VirtualTable } from "../VirtualTable";

interface TestRow {
  id: number;
  name: string;
}

const generateRows = (count: number): TestRow[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Row ${i}`,
  }));

describe("VirtualTable", () => {
  it("should render visible rows only", () => {
    const rows = generateRows(100);

    render(
      <VirtualTable
        rows={rows}
        rowHeight={40}
        height={200}
        columns={[
          { key: "id", title: "ID" },
          { key: "name", title: "Name" },
        ]}
        renderCell={(row, col) => String(row[col.key as keyof TestRow])}
      />
    );

    // 200px / 40px = 5 行 + 3 overscan = 8 行
    // 不应该渲染 Row 20
    expect(screen.queryByText("Row 0")).toBeInTheDocument();
    expect(screen.queryByText("Row 7")).toBeInTheDocument();
    expect(screen.queryByText("Row 20")).not.toBeInTheDocument();
  });

  it("should render header row", () => {
    const rows = generateRows(10);

    render(
      <VirtualTable
        rows={rows}
        rowHeight={40}
        height={200}
        columns={[
          { key: "id", title: "ID" },
          { key: "name", title: "Name" },
        ]}
        renderCell={(row, col) => String(row[col.key as keyof TestRow])}
      />
    );

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("should handle empty rows", () => {
    render(
      <VirtualTable
        rows={[]}
        rowHeight={40}
        height={200}
        columns={[{ key: "id", title: "ID" }]}
        renderCell={() => ""}
        emptyText="No data"
      />
    );

    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/dmworkbase && pnpm test -- --testPathPattern="VirtualTable.test" --watch=false`
Expected: FAIL - 模块不存在

- [ ] **Step 3: 创建样式文件**

```css
/* packages/dmworkbase/src/Components/VirtualTable/VirtualTable.css */
.wk-virtual-table {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wk-virtual-table__scroll-container {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.wk-virtual-table__table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.wk-virtual-table__header-cell {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--wk-bg-elevated);
  padding: var(--wk-sp-2) var(--wk-sp-3);
  text-align: left;
  font-weight: 500;
  font-size: var(--wk-text-size-sm);
  color: var(--wk-text-primary);
  border-bottom: 1px solid var(--wk-border-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wk-virtual-table__cell {
  padding: var(--wk-sp-2) var(--wk-sp-3);
  font-size: var(--wk-text-size-sm);
  color: var(--wk-text-primary);
  border-bottom: 1px solid var(--wk-border-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wk-virtual-table__row:hover .wk-virtual-table__cell {
  background: var(--wk-bg-hover);
}

.wk-virtual-table__spacer {
  padding: 0;
  border: none;
}

.wk-virtual-table__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--wk-text-secondary);
  font-size: var(--wk-text-size-md);
}
```

- [ ] **Step 4: 实现 VirtualTable 组件**

```tsx
// packages/dmworkbase/src/Components/VirtualTable/VirtualTable.tsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import { useVirtualScroll } from "./useVirtualScroll";
import "./VirtualTable.css";

export interface ColumnConfig<K = string> {
  key: K;
  title: React.ReactNode;
  width?: number | string;
}

export interface VirtualTableProps<Row> {
  /** 数据行 */
  rows: Row[];
  /** 列配置 */
  columns: ColumnConfig[];
  /** 固定行高 (px) */
  rowHeight: number;
  /** 容器高度 (px 或 CSS 值) */
  height: number | string;
  /** 渲染单元格内容 */
  renderCell: (row: Row, column: ColumnConfig, rowIndex: number) => React.ReactNode;
  /** 渲染表头单元格，默认使用 column.title */
  renderHeaderCell?: (column: ColumnConfig, colIndex: number) => React.ReactNode;
  /** 空状态文案 */
  emptyText?: React.ReactNode;
  /** 上下额外渲染行数 */
  overscan?: number;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 获取行的唯一 key */
  rowKey?: (row: Row, index: number) => string | number;
}

export function VirtualTable<Row>({
  rows,
  columns,
  rowHeight,
  height,
  renderCell,
  renderHeaderCell,
  emptyText = "暂无数据",
  overscan = 3,
  className,
  style,
  rowKey,
}: VirtualTableProps<Row>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(
    typeof height === "number" ? height : 400
  );

  // 监听滚动
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  // 监听容器尺寸变化
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(container);
      return () => observer.disconnect();
    }
  }, []);

  const { startIndex, endIndex, topSpacerHeight, bottomSpacerHeight } =
    useVirtualScroll({
      totalCount: rows.length,
      rowHeight,
      containerHeight,
      scrollTop,
      overscan,
    });

  const visibleRows = rows.slice(startIndex, endIndex);

  const getRowKey = (row: Row, index: number): string | number => {
    if (rowKey) return rowKey(row, index);
    return startIndex + index;
  };

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  if (rows.length === 0) {
    return (
      <div
        className={`wk-virtual-table ${className || ""}`}
        style={{ height: heightStyle, ...style }}
      >
        <div className="wk-virtual-table__empty">{emptyText}</div>
      </div>
    );
  }

  return (
    <div
      className={`wk-virtual-table ${className || ""}`}
      style={{ height: heightStyle, ...style }}
    >
      <div
        ref={scrollRef}
        className="wk-virtual-table__scroll-container"
        onScroll={handleScroll}
      >
        <table className="wk-virtual-table__table">
          <thead>
            <tr>
              {columns.map((col, colIndex) => (
                <th
                  key={String(col.key)}
                  className="wk-virtual-table__header-cell"
                  style={{ width: col.width }}
                >
                  {renderHeaderCell
                    ? renderHeaderCell(col, colIndex)
                    : col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 顶部占位行 */}
            {topSpacerHeight > 0 && (
              <tr className="wk-virtual-table__spacer">
                <td
                  colSpan={columns.length}
                  style={{ height: topSpacerHeight, padding: 0, border: "none" }}
                />
              </tr>
            )}

            {/* 可见行 */}
            {visibleRows.map((row, localIndex) => {
              const actualIndex = startIndex + localIndex;
              return (
                <tr key={getRowKey(row, localIndex)} className="wk-virtual-table__row">
                  {columns.map((col, colIndex) => (
                    <td
                      key={String(col.key)}
                      className="wk-virtual-table__cell"
                      style={{
                        height: rowHeight,
                        maxHeight: rowHeight,
                        width: col.width,
                      }}
                    >
                      {renderCell(row, col, actualIndex)}
                    </td>
                  ))}
                </tr>
              );
            })}

            {/* 底部占位行 */}
            {bottomSpacerHeight > 0 && (
              <tr className="wk-virtual-table__spacer">
                <td
                  colSpan={columns.length}
                  style={{ height: bottomSpacerHeight, padding: 0, border: "none" }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd packages/dmworkbase && pnpm test -- --testPathPattern="VirtualTable.test" --watch=false`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add packages/dmworkbase/src/Components/VirtualTable/
git commit -m "feat(VirtualTable): add VirtualTable component with table-compatible virtual scrolling"
```

---

## Task 3: 创建导出入口

**Files:**
- Create: `packages/dmworkbase/src/Components/VirtualTable/index.ts`

- [ ] **Step 1: 创建入口文件**

```typescript
// packages/dmworkbase/src/Components/VirtualTable/index.ts
export { VirtualTable } from "./VirtualTable";
export type { VirtualTableProps, ColumnConfig } from "./VirtualTable";
export { useVirtualScroll } from "./useVirtualScroll";
export type { UseVirtualScrollOptions, VirtualScrollResult } from "./useVirtualScroll";
```

- [ ] **Step 2: 提交**

```bash
git add packages/dmworkbase/src/Components/VirtualTable/index.ts
git commit -m "feat(VirtualTable): add exports"
```

---

## Task 4: 集成到 ExcelRenderer

**Files:**
- Modify: `packages/dmworkbase/src/Components/FilePreviewPanel/renderers/ExcelRenderer.tsx`

- [ ] **Step 1: 修改 ExcelRenderer 使用 VirtualTable**

```tsx
// packages/dmworkbase/src/Components/FilePreviewPanel/renderers/ExcelRenderer.tsx
// 替换原有的 SheetTable 组件

import React, { useState, useEffect, useCallback } from "react";
import { BaseRendererProps } from "../types";
import { TooltipCell } from "./TooltipCell";
import { VirtualTable, ColumnConfig } from "../../VirtualTable";
import "./ExcelRenderer.css";

export interface ExcelRendererProps extends BaseRendererProps {}

/** 工作表数据 */
interface SheetData {
  name: string;
  data: Record<string | symbol, unknown>[];
  columns: ColumnConfig<string | symbol>[];
}

const DEFAULT_ROW_HEIGHT = 40;

// 动态加载 xlsx 库
let xlsxLibrary: typeof import("xlsx") | null = null;

async function loadXlsxLibrary(): Promise<typeof import("xlsx")> {
  if (xlsxLibrary) return xlsxLibrary;

  try {
    xlsxLibrary = await import("xlsx");
    return xlsxLibrary;
  } catch {
    xlsxLibrary = (window as unknown as Record<string, typeof import("xlsx")>)
      .XLSX;
    if (xlsxLibrary) return xlsxLibrary;
    throw new Error("xlsx library not available");
  }
}

/**
 * 裁剪尾部空行和右侧空列
 */
const trimEmptyRowsAndColumns = (data: unknown[][]): unknown[][] => {
  if (!data || data.length === 0) return data;

  // 1. 裁剪尾部空行
  let lastNonEmptyRowIndex = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const hasContent = row.some(
      (cell) => cell !== null && cell !== undefined && cell !== ""
    );
    if (hasContent) {
      lastNonEmptyRowIndex = i;
      break;
    }
  }
  const trimmedRows = data.slice(0, lastNonEmptyRowIndex + 1);
  if (trimmedRows.length === 0) return [];

  // 2. 找到最右侧非空列
  let lastNonEmptyColIndex = 0;
  trimmedRows.forEach((row) => {
    for (let i = row.length - 1; i >= 0; i--) {
      const cell = row[i];
      if (cell !== null && cell !== undefined && cell !== "") {
        lastNonEmptyColIndex = Math.max(lastNonEmptyColIndex, i);
        break;
      }
    }
  });

  // 3. 裁剪右侧空列
  return trimmedRows.map((row) => row.slice(0, lastNonEmptyColIndex + 1));
};

/**
 * 解析工作簿为 SheetData 数组
 */
function parseWorkbook(
  XLSX: typeof import("xlsx"),
  rawData: ArrayBuffer | Uint8Array
): SheetData[] {
  const workbook = XLSX.read(rawData, {
    type: "array",
    codepage: 65001,
    raw: true,
  });

  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true,
    }) as unknown[][];

    const trimmedData = trimEmptyRowsAndColumns(jsonData);
    const headers =
      trimmedData.length > 0 ? (trimmedData[0] as string[]) : [];

    // 构建列配置，用 Symbol 处理重复列名
    const headerNameCount = new Map<string, number>();
    const columns: ColumnConfig<string | symbol>[] = [];
    const keyMapping = new Map<number, string | symbol>();

    headers.forEach((headerValue, idx) => {
      const headerName = headerValue || "-";
      const count = headerNameCount.get(headerName) || 0;
      headerNameCount.set(headerName, count + 1);
      const uniqueKey = count > 0 ? Symbol(headerName) : headerName;
      columns.push({ key: uniqueKey, title: headerName });
      keyMapping.set(idx, uniqueKey);
    });

    // 转换为对象数组
    const rows = trimmedData.slice(1).map((row) => {
      const newRow: Record<string | symbol, unknown> = {};
      (row as unknown[]).forEach((cell, idx) => {
        const uniqueKey = keyMapping.get(idx);
        if (uniqueKey) {
          newRow[uniqueKey] = cell;
        }
      });
      return newRow;
    });

    return { name, data: rows, columns };
  });
}

/**
 * 表格内容组件（虚拟滚动）
 */
function SheetTable({ sheetData }: { sheetData: SheetData }) {
  const { data, columns } = sheetData;

  const renderCellContent = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  if (!data || data.length === 0) {
    return (
      <div className="wk-file-preview-excel-renderer--empty">
        <span>暂无内容</span>
      </div>
    );
  }

  return (
    <VirtualTable
      rows={data}
      columns={columns as ColumnConfig[]}
      rowHeight={DEFAULT_ROW_HEIGHT}
      height="100%"
      className="wk-file-preview-excel-renderer__sheet-table"
      renderHeaderCell={(col) => <TooltipCell content={String(col.title)} />}
      renderCell={(row, col) => (
        <TooltipCell
          content={renderCellContent(row[col.key as string | symbol])}
        />
      )}
      emptyText="暂无内容"
    />
  );
}

/**
 * Excel/CSV 渲染器
 * 支持 xlsx, xls, xlsb, xlsm, csv 格式
 * 使用虚拟滚动高效渲染大数据量
 */
const ExcelRenderer: React.FC<ExcelRendererProps> = ({ file, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);

  const loadContent = useCallback(async () => {
    if (!file.url) return;

    setLoading(true);
    setError(null);
    setSheets([]);
    setActiveSheet(0);

    try {
      const XLSX = await loadXlsxLibrary();
      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const parsedSheets = parseWorkbook(XLSX, new Uint8Array(buffer));

      if (parsedSheets.length === 0) {
        throw new Error("工作表为空");
      }

      setSheets(parsedSheets);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [file.url, onError]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

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
          onClick={loadContent}
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

  return (
    <div className="wk-file-preview-excel-renderer">
      {/* 表格内容区 */}
      <div className="wk-file-preview-excel-renderer__content">
        {sheets.map((sheet, index) => (
          <div
            key={sheet.name}
            style={{ display: index === activeSheet ? "contents" : "none" }}
          >
            <SheetTable sheetData={sheet} />
          </div>
        ))}
      </div>

      {/* 底部信息栏：行数 + 工作表切换 */}
      <div className="wk-file-preview-excel-renderer__footer">
        <span className="wk-file-preview-excel-renderer__row-count">
          共 {sheets[activeSheet]?.data.length ?? 0} 行
        </span>
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
      </div>
    </div>
  );
};

export default ExcelRenderer;
export { ExcelRenderer };
```

- [ ] **Step 2: 简化 ExcelRenderer.css**

移除不再需要的 table 相关样式（VirtualTable 有自己的样式），保留容器和状态样式。

- [ ] **Step 3: 在 Storybook 中测试**

Run: `cd packages/dmworkbase && pnpm storybook`
验证 Excel/CSV 渲染正常，滚动流畅，表头固定

- [ ] **Step 4: 提交**

```bash
git add packages/dmworkbase/src/Components/FilePreviewPanel/renderers/ExcelRenderer.tsx
git add packages/dmworkbase/src/Components/FilePreviewPanel/renderers/ExcelRenderer.css
git commit -m "refactor(ExcelRenderer): integrate VirtualTable for table-compatible virtual scrolling"
```

---

## Task 5: 清理旧的 VirtualList 文件

**Files:**
- Delete: `packages/dmworkbase/src/Components/FilePreviewPanel/renderers/VirtualList.tsx`
- Delete: `packages/dmworkbase/src/Components/FilePreviewPanel/renderers/VLManager.ts`

- [ ] **Step 1: 确认没有其他地方使用旧组件**

Run: `cd packages/dmworkbase && grep -r "VirtualList\|VLManager" src/ --include="*.tsx" --include="*.ts" | grep -v "VirtualTable"`

- [ ] **Step 2: 删除旧文件**

```bash
rm packages/dmworkbase/src/Components/FilePreviewPanel/renderers/VirtualList.tsx
rm packages/dmworkbase/src/Components/FilePreviewPanel/renderers/VLManager.ts
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "chore: remove deprecated VirtualList and VLManager"
```

---

## 完成检查

- [ ] 所有测试通过
- [ ] Storybook 中 Excel/CSV 预览正常
- [ ] 大数据量（1000+ 行）滚动流畅
- [ ] 表头 sticky 正常工作
- [ ] 无 console 错误
