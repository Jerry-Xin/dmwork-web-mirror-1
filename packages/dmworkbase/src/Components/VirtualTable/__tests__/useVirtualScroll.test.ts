// packages/dmworkbase/src/Components/VirtualTable/__tests__/useVirtualScroll.test.ts
import { describe, it, expect } from "vitest";
import { calculateVirtualScroll } from "../useVirtualScroll";

describe("useVirtualScroll", () => {
  it("should calculate visible range for initial state", () => {
    const result = calculateVirtualScroll({
      totalCount: 100,
      rowHeight: 40,
      containerHeight: 400,
      scrollTop: 0,
      overscan: 3,
    });

    // 400px / 40px = 10 visible rows, + 3 overscan bottom = 13
    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(13);
    expect(result.topSpacerHeight).toBe(0);
    expect(result.bottomSpacerHeight).toBe((100 - 13) * 40);
  });

  it("should calculate visible range when scrolled", () => {
    const result = calculateVirtualScroll({
      totalCount: 100,
      rowHeight: 40,
      containerHeight: 400,
      scrollTop: 200,
      overscan: 3,
    });

    expect(result.startIndex).toBe(2);
    expect(result.endIndex).toBe(18);
    expect(result.topSpacerHeight).toBe(2 * 40);
    expect(result.bottomSpacerHeight).toBe((100 - 18) * 40);
  });

  it("should clamp indices to valid range", () => {
    const result = calculateVirtualScroll({
      totalCount: 10,
      rowHeight: 40,
      containerHeight: 400,
      scrollTop: 0,
      overscan: 3,
    });

    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(10);
    expect(result.bottomSpacerHeight).toBe(0);
  });

  it("should handle empty list", () => {
    const result = calculateVirtualScroll({
      totalCount: 0,
      rowHeight: 40,
      containerHeight: 400,
      scrollTop: 0,
      overscan: 3,
    });

    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(0);
    expect(result.topSpacerHeight).toBe(0);
    expect(result.bottomSpacerHeight).toBe(0);
  });
});
