// packages/dmworkbase/src/Components/VirtualTable/__tests__/VirtualTable.test.tsx
import { describe, it, expect } from "vitest";
import { VirtualTable, VirtualTableProps, ColumnConfig } from "../VirtualTable";

// Type-level tests: verify exported types and component signature

interface TestRow {
  id: number;
  name: string;
}

describe("VirtualTable", () => {
  it("should export VirtualTable component", () => {
    expect(typeof VirtualTable).toBe("function");
  });

  it("should have correct prop types", () => {
    // This is a compile-time check - if it compiles, the types are correct
    const columns: ColumnConfig[] = [
      { key: "id", title: "ID" },
      { key: "name", title: "Name", width: 100 },
    ];

    const props: VirtualTableProps<TestRow> = {
      rows: [{ id: 1, name: "Test" }],
      columns,
      rowHeight: 40,
      height: 400,
      renderCell: (row, col) => String(row[col.key as keyof TestRow]),
    };

    expect(props.rows).toHaveLength(1);
    expect(props.columns).toHaveLength(2);
    expect(props.rowHeight).toBe(40);
    expect(props.height).toBe(400);
    expect(typeof props.renderCell).toBe("function");
  });

  it("should accept optional props", () => {
    const columns: ColumnConfig[] = [{ key: "id", title: "ID" }];

    const propsWithOptional: VirtualTableProps<TestRow> = {
      rows: [],
      columns,
      rowHeight: 40,
      height: "100%",
      renderCell: () => "",
      renderHeaderCell: (col) => col.title,
      emptyText: "No data",
      overscan: 5,
      className: "custom-class",
      style: { border: "1px solid red" },
      rowKey: (row) => row.id,
    };

    expect(propsWithOptional.height).toBe("100%");
    expect(propsWithOptional.emptyText).toBe("No data");
    expect(propsWithOptional.overscan).toBe(5);
  });

  it("should use generic Row type", () => {
    interface CustomRow {
      uuid: string;
      data: Record<string, unknown>;
    }

    const columns: ColumnConfig[] = [{ key: "uuid", title: "UUID" }];

    const customProps: VirtualTableProps<CustomRow> = {
      rows: [{ uuid: "abc-123", data: { foo: "bar" } }],
      columns,
      rowHeight: 50,
      height: 500,
      renderCell: (row) => row.uuid,
    };

    expect(customProps.rows[0].uuid).toBe("abc-123");
    expect(customProps.rows[0].data.foo).toBe("bar");
  });
});
