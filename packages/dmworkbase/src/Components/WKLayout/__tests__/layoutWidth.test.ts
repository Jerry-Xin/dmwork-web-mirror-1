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
            // 800 * 0.45 = 360
            expect(getMaxLeftWidth(800)).toBe(360)
        })

        it('caps at SPLITTER_MAX_WIDTH for wide containers', () => {
            // 1400 * 0.45 = 630 > 480
            expect(getMaxLeftWidth(1400)).toBe(SPLITTER_MAX_WIDTH)
        })

        it('never goes below SPLITTER_MIN_WIDTH', () => {
            // 400 * 0.45 = 180 < 240
            expect(getMaxLeftWidth(400)).toBe(SPLITTER_MIN_WIDTH)
        })
    })

    describe('clampWidth', () => {
        it('clamps below minimum', () => {
            expect(clampWidth(100, 1200)).toBe(SPLITTER_MIN_WIDTH)
        })

        it('clamps above dynamic maximum', () => {
            // container=800 → max = 360
            expect(clampWidth(500, 800)).toBe(360)
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
            persistWidth(350)
            expect(restoreWidth()).toBe(350)
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
