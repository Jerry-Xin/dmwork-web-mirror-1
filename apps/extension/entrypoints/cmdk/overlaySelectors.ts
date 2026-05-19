export const PORTAL_SELECTORS = [
  "[data-tippy-root]",
  ".tippy-box",
  ".tippy-content",
  ".wk-emojitoolbar-emojipanel",
  ".wk-emojitoolbar",
  ".octo-composer-emoji-panel",
  ".octo-composer-emoji-mask",
  ".semi-dropdown",
];

export function isInsidePortal(target: Element): boolean {
  return PORTAL_SELECTORS.some((sel) => target.closest(sel) !== null);
}
