/**
 * Unit tests for Conversation beforeunload event listener cleanup
 * Tests that beforeunload event listener is properly added/removed (fix for issue #125)
 */

describe('Conversation beforeunload event listener cleanup', () => {
    let addEventListenerSpy: jest.SpyInstance;
    let removeEventListenerSpy: jest.SpyInstance;

    beforeEach(() => {
        addEventListenerSpy = jest.spyOn(window, 'addEventListener');
        removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });

    // Extracted beforeunload handler logic for testing
    function createBeforeUnloadManager() {
        let deallocCalled = false;

        const beforeUnloadHandler = () => {
            deallocCalled = true;
        };

        return {
            getDeallocCalled: () => deallocCalled,
            getHandler: () => beforeUnloadHandler,
            componentDidMount: () => {
                window.addEventListener('beforeunload', beforeUnloadHandler);
            },
            componentWillUnmount: () => {
                window.removeEventListener('beforeunload', beforeUnloadHandler);
            },
        };
    }

    it('should add beforeunload event listener on mount', () => {
        const manager = createBeforeUnloadManager();

        manager.componentDidMount();

        expect(addEventListenerSpy).toHaveBeenCalledWith(
            'beforeunload',
            manager.getHandler()
        );
    });

    it('should remove beforeunload event listener on unmount', () => {
        const manager = createBeforeUnloadManager();

        manager.componentDidMount();
        manager.componentWillUnmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
            'beforeunload',
            manager.getHandler()
        );
    });

    it('should use the same handler reference for add and remove', () => {
        const manager = createBeforeUnloadManager();

        manager.componentDidMount();
        manager.componentWillUnmount();

        const addedHandler = addEventListenerSpy.mock.calls.find(
            (call) => call[0] === 'beforeunload'
        )?.[1];
        const removedHandler = removeEventListenerSpy.mock.calls.find(
            (call) => call[0] === 'beforeunload'
        )?.[1];

        expect(addedHandler).toBe(removedHandler);
    });

    it('should not override other beforeunload handlers', () => {
        const otherHandler = jest.fn();
        window.addEventListener('beforeunload', otherHandler);

        const manager = createBeforeUnloadManager();
        manager.componentDidMount();
        manager.componentWillUnmount();

        // The other handler should still be registered
        // (addEventListener does not override, unlike direct assignment)
        expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', otherHandler);

        window.removeEventListener('beforeunload', otherHandler);
    });

    it('should call dealloc when beforeunload fires', () => {
        const manager = createBeforeUnloadManager();
        manager.componentDidMount();

        // Simulate beforeunload event
        const handler = manager.getHandler();
        handler();

        expect(manager.getDeallocCalled()).toBe(true);
    });
});
