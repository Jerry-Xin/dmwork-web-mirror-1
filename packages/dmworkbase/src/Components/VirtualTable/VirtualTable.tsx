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
  rows: Row[];
  columns: ColumnConfig[];
  rowHeight: number;
  height: number | string;
  renderCell: (row: Row, column: ColumnConfig, rowIndex: number) => React.ReactNode;
  renderHeaderCell?: (column: ColumnConfig, colIndex: number) => React.ReactNode;
  emptyText?: React.ReactNode;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
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

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

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
            {topSpacerHeight > 0 && (
              <tr className="wk-virtual-table__spacer">
                <td
                  colSpan={columns.length}
                  style={{ height: topSpacerHeight, padding: 0, border: "none" }}
                />
              </tr>
            )}

            {visibleRows.map((row, localIndex) => {
              const actualIndex = startIndex + localIndex;
              return (
                <tr key={getRowKey(row, localIndex)} className="wk-virtual-table__row">
                  {columns.map((col) => (
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
