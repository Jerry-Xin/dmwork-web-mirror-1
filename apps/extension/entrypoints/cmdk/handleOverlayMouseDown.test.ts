import { describe, it, expect } from "vitest";
import { PORTAL_SELECTORS, isInsidePortal } from "./overlaySelectors";

/**
 * handleOverlayMouseDown uses element.closest() to decide whether a click
 * should close the CmdK panel. This test verifies that clicks inside
 * Semi-UI dropdown portal elements are correctly identified as "internal"
 * and do NOT trigger panel close.
 *
 * We test the selector logic directly against real DOM structures.
 */

describe("handleOverlayMouseDown - Semi-UI dropdown exclusion", () => {
  it("click inside .semi-dropdown should be ignored (not close panel)", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="semi-portal">
        <div class="semi-dropdown">
          <div class="semi-dropdown-menu">
            <div class="semi-dropdown-item" data-testid="voice-mode">语音输入</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    const item = container.querySelector(
      ".semi-dropdown-item"
    ) as HTMLElement;
    expect(isInsidePortal(item)).toBe(true);

    document.body.removeChild(container);
  });

  it("click inside .semi-portal (without .semi-dropdown child) should close panel", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="semi-portal">
        <div class="semi-tooltip-content">tooltip text</div>
      </div>
    `;
    document.body.appendChild(container);

    const tooltip = container.querySelector(
      ".semi-tooltip-content"
    ) as HTMLElement;
    expect(isInsidePortal(tooltip)).toBe(false);

    document.body.removeChild(container);
  });

  it("click on .semi-dropdown root element itself should be ignored", () => {
    const dropdown = document.createElement("div");
    dropdown.className = "semi-dropdown";
    document.body.appendChild(dropdown);

    expect(isInsidePortal(dropdown)).toBe(true);

    document.body.removeChild(dropdown);
  });

  it("click on plain body element should NOT be ignored (should close panel)", () => {
    const el = document.createElement("div");
    el.className = "some-random-overlay";
    document.body.appendChild(el);

    expect(isInsidePortal(el)).toBe(false);

    document.body.removeChild(el);
  });

  it("click inside tippy portal should still be ignored", () => {
    const container = document.createElement("div");
    container.setAttribute("data-tippy-root", "");
    container.innerHTML = `<div class="tippy-box"><div class="tippy-content">mention</div></div>`;
    document.body.appendChild(container);

    const content = container.querySelector(".tippy-content") as HTMLElement;
    expect(isInsidePortal(content)).toBe(true);

    document.body.removeChild(container);
  });

  it("click inside emoji panel should still be ignored", () => {
    const container = document.createElement("div");
    container.className = "wk-emojitoolbar-emojipanel";
    container.innerHTML = `<span>😀</span>`;
    document.body.appendChild(container);

    const emoji = container.querySelector("span") as HTMLElement;
    expect(isInsidePortal(emoji)).toBe(true);

    document.body.removeChild(container);
  });

  it("click inside octo-composer-emoji-panel should still be ignored", () => {
    const container = document.createElement("div");
    container.className = "octo-composer-emoji-panel";
    container.innerHTML = `<span>🎉</span>`;
    document.body.appendChild(container);

    const emoji = container.querySelector("span") as HTMLElement;
    expect(isInsidePortal(emoji)).toBe(true);

    document.body.removeChild(container);
  });
});
