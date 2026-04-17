/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
    SPLITTER_MIN_WIDTH,
    SPLITTER_MAX_WIDTH,
    SPLITTER_DEFAULT_WIDTH,
    SPLITTER_STORAGE_KEY,
    getMaxLeftWidth,
    clampWidth,
    restoreWidth,
    persistWidth,
} from '../layoutWidth'

describe('layoutWidth', () => {
    describe('getMaxLeftWidth', () => {
        it('returns 45% of container when that is below SPLITTER_MAX_WIDTH', () => {
            // 700 * 0.45 = 315
            expect(getMaxLeftWidth(700)).toBe(315)
        })

        it('caps at SPLITTER_MAX_WIDTH for wide containers', () => {
            // 1400 * 0.45 = 630 > 360
            expect(getMaxLeftWidth(1400)).toBe(SPLITTER_MAX_WIDTH)
        })

        it('never goes below SPLITTER_MIN_WIDTH', () => {
            // 300 * 0.45 = 135 < 190
            expect(getMaxLeftWidth(300)).toBe(SPLITTER_MIN_WIDTH)
        })
    })

    describe('clampWidth', () => {
        it('clamps below minimum', () => {
            expect(clampWidth(100, 1200)).toBe(SPLITTER_MIN_WIDTH)
        })

        it('clamps above dynamic maximum', () => {
            // container=700 → max = 315
            expect(clampWidth(500, 700)).toBe(315)
        })

        it('passes through valid values', () => {
            expect(clampWidth(300, 1200)).toBe(300)
        })
    })

    describe('restoreWidth / persistWidth', () => {
        beforeEach(() => {
            localStorage.clear()
        })

        it('returns default when nothing stored', () => {
            expect(restoreWidth()).toBe(SPLITTER_DEFAULT_WIDTH)
        })

        it('restores a previously persisted value', () => {
            persistWidth(300)
            expect(restoreWidth()).toBe(300)
        })

        it('returns default for out-of-range stored values', () => {
            localStorage.setItem(SPLITTER_STORAGE_KEY, '9999')
            expect(restoreWidth()).toBe(SPLITTER_DEFAULT_WIDTH)
        })

        it('returns default for non-numeric stored values', () => {
            localStorage.setItem(SPLITTER_STORAGE_KEY, 'abc')
            expect(restoreWidth()).toBe(SPLITTER_DEFAULT_WIDTH)
        })
    })
})
