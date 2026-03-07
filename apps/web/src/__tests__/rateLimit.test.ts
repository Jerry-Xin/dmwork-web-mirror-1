/**
 * Unit tests for debounce and throttle utility functions
 * Tests the rate limiting logic used across components
 */

describe('rateLimit utilities', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('debounce', () => {
        // Extracted debounce logic for testing
        function debounce<T extends (...args: Parameters<T>) => void>(
            func: T,
            wait: number
        ): (...args: Parameters<T>) => void {
            let timeoutId: ReturnType<typeof setTimeout> | null = null;

            return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                }
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    timeoutId = null;
                }, wait);
            };
        }

        it('should delay function execution', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 300);

            debouncedFn();
            expect(mockFn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(300);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should reset timer on subsequent calls', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 300);

            debouncedFn();
            jest.advanceTimersByTime(200);
            debouncedFn();
            jest.advanceTimersByTime(200);

            expect(mockFn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should pass arguments to the function', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 300);

            debouncedFn('test', 123);
            jest.advanceTimersByTime(300);

            expect(mockFn).toHaveBeenCalledWith('test', 123);
        });

        it('should only call once for rapid consecutive calls', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 300);

            for (let i = 0; i < 10; i++) {
                debouncedFn();
                jest.advanceTimersByTime(50);
            }

            expect(mockFn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(300);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('throttle', () => {
        // Extracted throttle logic for testing
        function throttle<T extends (...args: Parameters<T>) => void>(
            func: T,
            wait: number
        ): (...args: Parameters<T>) => void {
            let lastTime = 0;
            let timeoutId: ReturnType<typeof setTimeout> | null = null;

            return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
                const now = Date.now();
                const remaining = wait - (now - lastTime);

                if (remaining <= 0) {
                    if (timeoutId !== null) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    lastTime = now;
                    func.apply(this, args);
                } else if (timeoutId === null) {
                    timeoutId = setTimeout(() => {
                        lastTime = Date.now();
                        timeoutId = null;
                        func.apply(this, args);
                    }, remaining);
                }
            };
        }

        it('should execute immediately on first call', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);

            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should throttle subsequent calls', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);

            throttledFn();
            throttledFn();
            throttledFn();

            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should execute trailing call after wait period', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);

            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(1);

            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(100);
            expect(mockFn).toHaveBeenCalledTimes(2);
        });

        it('should pass arguments to the function', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);

            throttledFn('test', 456);
            expect(mockFn).toHaveBeenCalledWith('test', 456);
        });

        it('should allow new call after wait period', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);

            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(100);

            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(2);
        });

        it('should limit call frequency in rapid succession', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);

            // Call 20 times over 200ms (every 10ms)
            for (let i = 0; i < 20; i++) {
                throttledFn();
                jest.advanceTimersByTime(10);
            }

            // Should have called at t=0, and scheduled trailing calls
            // First call at 0ms, then after each 100ms interval
            expect(mockFn.mock.calls.length).toBeGreaterThanOrEqual(2);
            expect(mockFn.mock.calls.length).toBeLessThanOrEqual(4);
        });
    });
});
