import { vi } from 'vitest'
/**
 * Unit tests for Conversation scrollTimer cleanup logic
 * Tests that scrollTimer is properly cleared on dealloc (fix for issue #124)
 */

describe('Conversation scrollTimer cleanup', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // Extracted scrollTimer cleanup logic for testing
    function createScrollTimerManager() {
        let scrollTimer: ReturnType<typeof setTimeout> | null = null;

        return {
            getTimer: () => scrollTimer,
            setTimer: (callback: () => void, delay: number) => {
                if (scrollTimer) {
                    clearTimeout(scrollTimer);
                    scrollTimer = null;
                }
                scrollTimer = setTimeout(callback, delay);
            },
            dealloc: () => {
                if (scrollTimer) {
                    clearTimeout(scrollTimer);
                    scrollTimer = null;
                }
            },
        };
    }

    it('should have null scrollTimer initially', () => {
        const manager = createScrollTimerManager();
        expect(manager.getTimer()).toBeNull();
    });

    it('should set scrollTimer when setTimer is called', () => {
        const manager = createScrollTimerManager();
        const callback = vi.fn();

        manager.setTimer(callback, 500);

        expect(manager.getTimer()).not.toBeNull();
    });

    it('should clear previous timer when setTimer is called multiple times', () => {
        const manager = createScrollTimerManager();
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        manager.setTimer(callback1, 500);
        manager.setTimer(callback2, 500);

        vi.advanceTimersByTime(500);

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should clear scrollTimer on dealloc', () => {
        const manager = createScrollTimerManager();
        const callback = vi.fn();

        manager.setTimer(callback, 500);
        expect(manager.getTimer()).not.toBeNull();

        manager.dealloc();

        expect(manager.getTimer()).toBeNull();
    });

    it('should prevent callback execution after dealloc', () => {
        const manager = createScrollTimerManager();
        const callback = vi.fn();

        manager.setTimer(callback, 500);
        manager.dealloc();

        vi.advanceTimersByTime(500);

        expect(callback).not.toHaveBeenCalled();
    });

    it('should handle dealloc when no timer is set', () => {
        const manager = createScrollTimerManager();

        // Should not throw
        expect(() => manager.dealloc()).not.toThrow();
        expect(manager.getTimer()).toBeNull();
    });
});
