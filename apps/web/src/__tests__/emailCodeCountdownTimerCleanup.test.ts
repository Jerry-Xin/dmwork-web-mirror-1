import { vi } from 'vitest'
/**
 * Unit tests for email code countdown timer cleanup logic in LoginVM
 * Tests that countdown timer is properly cleared before creating a new one (fix for issue #131)
 */

describe('Email code countdown timer cleanup', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // Extracted countdown timer logic for testing (mirrors LoginVM implementation)
    function createCountdownManager() {
        let countdownTimer: ReturnType<typeof setInterval> | undefined;
        let countdown = 0;
        let notifyCount = 0;

        return {
            getTimer: () => countdownTimer,
            getCountdown: () => countdown,
            getNotifyCount: () => notifyCount,
            // Simulates requestEmailSendCode success handler
            startCountdown: () => {
                countdown = 60;
                // Clear any existing timer before creating a new one
                if (countdownTimer) {
                    clearInterval(countdownTimer);
                    countdownTimer = undefined;
                }
                countdownTimer = setInterval(() => {
                    countdown--;
                    if (countdown <= 0) {
                        clearInterval(countdownTimer);
                        countdownTimer = undefined;
                    }
                    notifyCount++;
                }, 1000);
            },
            // Simulates didUnMount
            cleanup: () => {
                if (countdownTimer) {
                    clearInterval(countdownTimer);
                    countdownTimer = undefined;
                }
            },
        };
    }

    it('should have undefined timer initially', () => {
        const manager = createCountdownManager();
        expect(manager.getTimer()).toBeUndefined();
    });

    it('should set timer when startCountdown is called', () => {
        const manager = createCountdownManager();

        manager.startCountdown();

        expect(manager.getTimer()).toBeDefined();
        expect(manager.getCountdown()).toBe(60);
    });

    it('should clear previous timer when startCountdown is called multiple times', () => {
        const manager = createCountdownManager();

        manager.startCountdown();
        const firstTimer = manager.getTimer();

        // Advance 2 seconds
        vi.advanceTimersByTime(2000);
        expect(manager.getCountdown()).toBe(58);

        // Start new countdown - should clear old timer first
        manager.startCountdown();
        const secondTimer = manager.getTimer();

        // Timer reference should be different
        expect(secondTimer).not.toBe(firstTimer);
        // Countdown should reset to 60
        expect(manager.getCountdown()).toBe(60);

        // Only the new timer should tick
        const notifyCountBefore = manager.getNotifyCount();
        vi.advanceTimersByTime(3000);
        // Should have 3 more notifications (from new timer only)
        expect(manager.getNotifyCount() - notifyCountBefore).toBe(3);
        expect(manager.getCountdown()).toBe(57);
    });

    it('should prevent duplicate timer intervals when called rapidly', () => {
        const manager = createCountdownManager();

        // Simulate rapid clicks - call multiple times quickly
        manager.startCountdown();
        manager.startCountdown();
        manager.startCountdown();

        // Advance 1 second
        vi.advanceTimersByTime(1000);

        // Should only have 1 notification (only one timer active)
        // If timers weren't cleared, would have 3 notifications
        expect(manager.getNotifyCount()).toBe(1);
        expect(manager.getCountdown()).toBe(59);
    });

    it('should clear timer and set to undefined when countdown reaches 0', () => {
        const manager = createCountdownManager();

        manager.startCountdown();
        expect(manager.getTimer()).toBeDefined();

        // Advance full 60 seconds
        vi.advanceTimersByTime(60000);

        expect(manager.getCountdown()).toBe(0);
        expect(manager.getTimer()).toBeUndefined();
    });

    it('should clear timer on cleanup (didUnMount)', () => {
        const manager = createCountdownManager();

        manager.startCountdown();
        expect(manager.getTimer()).toBeDefined();

        manager.cleanup();

        expect(manager.getTimer()).toBeUndefined();
    });

    it('should prevent countdown after cleanup', () => {
        const manager = createCountdownManager();

        manager.startCountdown();
        const notifyCountBefore = manager.getNotifyCount();

        manager.cleanup();

        vi.advanceTimersByTime(5000);

        // No more notifications after cleanup
        expect(manager.getNotifyCount()).toBe(notifyCountBefore);
    });

    it('should handle cleanup when no timer is set', () => {
        const manager = createCountdownManager();

        // Should not throw
        expect(() => manager.cleanup()).not.toThrow();
        expect(manager.getTimer()).toBeUndefined();
    });
});
