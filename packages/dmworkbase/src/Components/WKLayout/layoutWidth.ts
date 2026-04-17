/**
 * Layout width utilities for the draggable splitter.
 *
 * Extracted so the clamping / persist logic can be unit-tested
 * without mounting the full WKLayout component.
 */

export const SPLITTER_MIN_WIDTH = 190
export const SPLITTER_MAX_WIDTH = 360
export const SPLITTER_DEFAULT_WIDTH = 300
export const SPLITTER_STORAGE_KEY = 'wk-layout-left-width'

/**
 * Calculate the effective maximum left-panel width.
 * Rule: min(SPLITTER_MAX_WIDTH, containerWidth * 0.45)
 * Never goes below SPLITTER_MIN_WIDTH.
 */
export function getMaxLeftWidth(containerWidth: number): number {
    const dynamicMax = Math.floor(containerWidth * 0.45)
    return Math.max(SPLITTER_MIN_WIDTH, Math.min(SPLITTER_MAX_WIDTH, dynamicMax))
}

/**
 * Clamp a width value within the allowed range for a given container.
 */
export function clampWidth(width: number, containerWidth: number): number {
    const max = getMaxLeftWidth(containerWidth)
    return Math.max(SPLITTER_MIN_WIDTH, Math.min(max, width))
}

/**
 * Restore persisted width from localStorage.
 * Returns SPLITTER_DEFAULT_WIDTH if nothing stored or value is invalid.
 * The returned value is NOT yet clamped against container width
 * (caller should clamp after measuring DOM).
 */
export function restoreWidth(): number {
    try {
        const stored = localStorage.getItem(SPLITTER_STORAGE_KEY)
        if (stored) {
            const parsed = parseInt(stored, 10)
            if (!isNaN(parsed) && parsed >= SPLITTER_MIN_WIDTH && parsed <= SPLITTER_MAX_WIDTH) {
                return parsed
            }
        }
    } catch (_) {}
    return SPLITTER_DEFAULT_WIDTH
}

/**
 * Persist width to localStorage.
 */
export function persistWidth(width: number): void {
    try {
        localStorage.setItem(SPLITTER_STORAGE_KEY, String(width))
    } catch (_) {}
}
