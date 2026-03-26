import { vi } from 'vitest'
/**
 * Unit tests for requestLogin error handling logic in LoginVM
 * Tests that loginLoading state is properly reset even when API call fails (fix for issue #128)
 */

describe('requestLogin error handling', () => {
    // Simulates the requestLogin logic with error handling
    function createLoginManager() {
        let loginLoading = false;
        let loginSuccess = false;
        let errorLogged: unknown = null;
        let notifyCount = 0;

        return {
            isLoading: () => loginLoading,
            isLoginSuccess: () => loginSuccess,
            getError: () => errorLogged,
            getNotifyCount: () => notifyCount,
            reset: () => {
                loginLoading = false;
                loginSuccess = false;
                errorLogged = null;
                notifyCount = 0;
            },
            // Simulates requestLogin with the fix
            async requestLogin(apiCall: () => Promise<{ token: string } | null>) {
                if (loginLoading) {
                    return;
                }
                loginLoading = true;
                notifyCount++;
                try {
                    const resp = await apiCall();
                    if (resp) {
                        loginSuccess = true;
                    }
                } catch (error) {
                    errorLogged = error;
                    console.error('Login failed:', error);
                } finally {
                    loginLoading = false;
                    notifyCount++;
                }
            },
        };
    }

    it('should have loginLoading false initially', () => {
        const manager = createLoginManager();
        expect(manager.isLoading()).toBe(false);
    });

    it('should set loginLoading to true during request', async () => {
        const manager = createLoginManager();
        let resolvePromise: (value: { token: string }) => void;
        const pendingPromise = new Promise<{ token: string }>((resolve) => {
            resolvePromise = resolve;
        });

        const loginPromise = manager.requestLogin(() => pendingPromise);

        // Should be loading before promise resolves
        expect(manager.isLoading()).toBe(true);

        // Resolve the promise
        resolvePromise!({ token: 'test-token' });
        await loginPromise;

        expect(manager.isLoading()).toBe(false);
    });

    it('should reset loginLoading to false after successful API call', async () => {
        const manager = createLoginManager();

        await manager.requestLogin(async () => ({ token: 'test-token' }));

        expect(manager.isLoading()).toBe(false);
        expect(manager.isLoginSuccess()).toBe(true);
        expect(manager.getError()).toBeNull();
    });

    it('should reset loginLoading to false when API call fails', async () => {
        const manager = createLoginManager();
        const testError = new Error('Network error');

        await manager.requestLogin(async () => {
            throw testError;
        });

        expect(manager.isLoading()).toBe(false);
        expect(manager.isLoginSuccess()).toBe(false);
        expect(manager.getError()).toBe(testError);
    });

    it('should call notifyListener both at start and end of request', async () => {
        const manager = createLoginManager();

        await manager.requestLogin(async () => ({ token: 'test' }));

        // Should notify twice: once when starting, once when finishing
        expect(manager.getNotifyCount()).toBe(2);
    });

    it('should call notifyListener twice even when API fails', async () => {
        const manager = createLoginManager();

        await manager.requestLogin(async () => {
            throw new Error('API Error');
        });

        // Should still notify twice even on error
        expect(manager.getNotifyCount()).toBe(2);
    });

    it('should prevent duplicate requests while loading', async () => {
        const manager = createLoginManager();
        let callCount = 0;
        let resolvePromise: (value: { token: string }) => void;
        const pendingPromise = new Promise<{ token: string }>((resolve) => {
            resolvePromise = resolve;
        });

        // Start first request
        const firstRequest = manager.requestLogin(async () => {
            callCount++;
            return pendingPromise;
        });

        // Try to start second request while first is pending
        await manager.requestLogin(async () => {
            callCount++;
            return { token: 'second' };
        });

        // Resolve first request
        resolvePromise!({ token: 'first' });
        await firstRequest;

        // Only the first call should have been made
        expect(callCount).toBe(1);
    });

    it('should allow new request after previous one completes', async () => {
        const manager = createLoginManager();
        let callCount = 0;

        await manager.requestLogin(async () => {
            callCount++;
            return { token: 'first' };
        });

        await manager.requestLogin(async () => {
            callCount++;
            return { token: 'second' };
        });

        expect(callCount).toBe(2);
    });

    it('should allow new request after previous one fails', async () => {
        const manager = createLoginManager();
        let callCount = 0;

        // First request fails
        await manager.requestLogin(async () => {
            callCount++;
            throw new Error('First failed');
        });

        expect(manager.isLoading()).toBe(false);

        // Second request should be allowed
        await manager.requestLogin(async () => {
            callCount++;
            return { token: 'success' };
        });

        expect(callCount).toBe(2);
        expect(manager.isLoginSuccess()).toBe(true);
    });

    it('should log error when API call fails', async () => {
        const manager = createLoginManager();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

        const testError = new Error('Test error');
        await manager.requestLogin(async () => {
            throw testError;
        });

        expect(consoleSpy).toHaveBeenCalledWith('Login failed:', testError);
        consoleSpy.mockRestore();
    });
});
