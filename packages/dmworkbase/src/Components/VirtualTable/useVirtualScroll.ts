// packages/dmworkbase/src/Components/VirtualTable/useVirtualScroll.ts
import { useMemo } from "react";

export interface UseVirtualScrollOptions {
  totalCount: number;
  rowHeight: number;
  containerHeight: number;
  scrollTop: number;
  overscan?: number;
}

export interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  totalHeight: number;
}

/**
 * Pure function to calculate virtual scroll positions.
 * Exported for testing purposes.
 */
export function calculateVirtualScroll({
  totalCount,
  rowHeight,
  containerHeight,
  scrollTop,
  overscan = 3,
}: UseVirtualScrollOptions): VirtualScrollResult {
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
  const visibleStartIndex = Math.floor(scrollTop / rowHeight);
  const visibleCount = Math.ceil(containerHeight / rowHeight);

  const startIndex = Math.max(0, visibleStartIndex - overscan);
  const endIndex = Math.min(totalCount, visibleStartIndex + visibleCount + overscan);

  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (totalCount - endIndex) * rowHeight);

  return {
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight,
    totalHeight,
  };
}

export function useVirtualScroll(options: UseVirtualScrollOptions): VirtualScrollResult {
  return useMemo(
    () => calculateVirtualScroll(options),
    [options.totalCount, options.rowHeight, options.containerHeight, options.scrollTop, options.overscan]
  );
}
