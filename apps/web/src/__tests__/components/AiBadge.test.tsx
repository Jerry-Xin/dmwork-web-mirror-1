import React from "react";
import { render } from "@testing-library/react";
import AiBadge from "../../../../../packages/dmworkbase/src/Components/AiBadge";

describe("AiBadge", () => {
    it("renders AI text", () => {
        const { container } = render(<AiBadge />);
        const badge = container.querySelector(".ai-badge");
        expect(badge).not.toBeNull();
        expect(badge?.textContent).toBe("AI");
    });

    it("applies default size class", () => {
        const { container } = render(<AiBadge />);
        const badge = container.querySelector(".ai-badge");
        expect(badge?.classList.contains("ai-badge-default")).toBe(true);
    });

    it("applies small size class when size is small", () => {
        const { container } = render(<AiBadge size="small" />);
        const badge = container.querySelector(".ai-badge");
        expect(badge?.classList.contains("ai-badge-small")).toBe(true);
    });

    it("applies custom className", () => {
        const { container } = render(<AiBadge className="custom-class" />);
        const badge = container.querySelector(".ai-badge");
        expect(badge?.classList.contains("custom-class")).toBe(true);
    });

    it("combines size and custom className", () => {
        const { container } = render(<AiBadge size="small" className="custom-class" />);
        const badge = container.querySelector(".ai-badge");
        expect(badge?.classList.contains("ai-badge")).toBe(true);
        expect(badge?.classList.contains("ai-badge-small")).toBe(true);
        expect(badge?.classList.contains("custom-class")).toBe(true);
    });
});
