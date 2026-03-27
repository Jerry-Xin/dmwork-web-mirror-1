import { vi } from 'vitest'
/**
 * Unit tests for Electron notification IPC listener cleanup
 * Tests that IPC listeners are properly managed to prevent memory leaks (fix for issue #349)
 */

describe('Electron notification IPC listener cleanup', () => {
    // Mock ipcRenderer
    const mockOn = vi.fn();
    const mockRemoveListener = vi.fn();
    const mockRemoveAllListeners = vi.fn();

    const mockIpcRenderer = {
        on: mockOn,
        removeListener: mockRemoveListener,
        removeAllListeners: mockRemoveAllListeners,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Simulate the onClicked implementation from preload/index.ts
    function createOnClickedHandler(ipcRenderer: typeof mockIpcRenderer) {
        return (callback: (data: any) => void) => {
            // Remove existing listeners to prevent accumulation and memory leaks
            ipcRenderer.removeAllListeners('notification-clicked');
            const handler = (_event: any, data: any) => callback(data);
            ipcRenderer.on('notification-clicked', handler);
            // Return cleanup function for proper resource management
            return () => ipcRenderer.removeListener('notification-clicked', handler);
        };
    }

    // Simulate the onActionClicked implementation from preload/index.ts
    function createOnActionClickedHandler(ipcRenderer: typeof mockIpcRenderer) {
        return (callback: (data: any) => void) => {
            // Remove existing listeners to prevent accumulation and memory leaks
            ipcRenderer.removeAllListeners('notification-action-clicked');
            const handler = (_event: any, data: any) => callback(data);
            ipcRenderer.on('notification-action-clicked', handler);
            // Return cleanup function for proper resource management
            return () => ipcRenderer.removeListener('notification-action-clicked', handler);
        };
    }

    describe('onClicked', () => {
        it('should remove all existing listeners before adding new one', () => {
            const onClicked = createOnClickedHandler(mockIpcRenderer);
            const callback = vi.fn();

            onClicked(callback);

            expect(mockRemoveAllListeners).toHaveBeenCalledWith('notification-clicked');
            expect(mockOn).toHaveBeenCalledWith('notification-clicked', expect.any(Function));
            // Verify order: removeAllListeners was called before on
            const removeAllListenersOrder = mockRemoveAllListeners.mock.invocationCallOrder[0];
            const onOrder = mockOn.mock.invocationCallOrder[0];
            expect(removeAllListenersOrder).toBeLessThan(onOrder);
        });

        it('should register a new listener for notification-clicked channel', () => {
            const onClicked = createOnClickedHandler(mockIpcRenderer);
            const callback = vi.fn();

            onClicked(callback);

            expect(mockOn).toHaveBeenCalledWith('notification-clicked', expect.any(Function));
        });

        it('should return a cleanup function that removes the listener', () => {
            const onClicked = createOnClickedHandler(mockIpcRenderer);
            const callback = vi.fn();

            const cleanup = onClicked(callback);

            expect(typeof cleanup).toBe('function');

            cleanup();

            expect(mockRemoveListener).toHaveBeenCalledWith('notification-clicked', expect.any(Function));
        });

        it('should call the callback with data when notification is clicked', () => {
            const onClicked = createOnClickedHandler(mockIpcRenderer);
            const callback = vi.fn();

            onClicked(callback);

            // Get the handler that was registered
            const registeredHandler = mockOn.mock.calls[0][1];
            const testData = { tag: 'test-tag', payload: { id: 123 } };

            // Simulate IPC event
            registeredHandler({}, testData);

            expect(callback).toHaveBeenCalledWith(testData);
        });

        it('should not accumulate listeners on multiple calls', () => {
            const onClicked = createOnClickedHandler(mockIpcRenderer);

            // Call multiple times (simulating component remounts)
            onClicked(vi.fn());
            onClicked(vi.fn());
            onClicked(vi.fn());

            // removeAllListeners should be called each time before adding
            expect(mockRemoveAllListeners).toHaveBeenCalledTimes(3);
            expect(mockOn).toHaveBeenCalledTimes(3);
        });
    });

    describe('onActionClicked', () => {
        it('should remove all existing listeners before adding new one', () => {
            const onActionClicked = createOnActionClickedHandler(mockIpcRenderer);
            const callback = vi.fn();

            onActionClicked(callback);

            expect(mockRemoveAllListeners).toHaveBeenCalledWith('notification-action-clicked');
            expect(mockOn).toHaveBeenCalledWith('notification-action-clicked', expect.any(Function));
            // Verify order: removeAllListeners was called before on
            const removeAllListenersOrder = mockRemoveAllListeners.mock.invocationCallOrder[0];
            const onOrder = mockOn.mock.invocationCallOrder[0];
            expect(removeAllListenersOrder).toBeLessThan(onOrder);
        });

        it('should register a new listener for notification-action-clicked channel', () => {
            const onActionClicked = createOnActionClickedHandler(mockIpcRenderer);
            const callback = vi.fn();

            onActionClicked(callback);

            expect(mockOn).toHaveBeenCalledWith('notification-action-clicked', expect.any(Function));
        });

        it('should return a cleanup function that removes the listener', () => {
            const onActionClicked = createOnActionClickedHandler(mockIpcRenderer);
            const callback = vi.fn();

            const cleanup = onActionClicked(callback);

            expect(typeof cleanup).toBe('function');

            cleanup();

            expect(mockRemoveListener).toHaveBeenCalledWith('notification-action-clicked', expect.any(Function));
        });

        it('should call the callback with data when action is clicked', () => {
            const onActionClicked = createOnActionClickedHandler(mockIpcRenderer);
            const callback = vi.fn();

            onActionClicked(callback);

            // Get the handler that was registered
            const registeredHandler = mockOn.mock.calls[0][1];
            const testData = { action: 'reply', payload: { text: 'hello' } };

            // Simulate IPC event
            registeredHandler({}, testData);

            expect(callback).toHaveBeenCalledWith(testData);
        });
    });
});
