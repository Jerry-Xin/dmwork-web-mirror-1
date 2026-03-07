/**
 * Unit tests for GlobalSearch race condition fix
 * Tests that only the latest search request's response is used
 * Fixes issue #244: Race condition when rapidly searching
 */

describe('GlobalSearch race condition handling', () => {
    /**
     * Simulates the race condition fix logic from GlobalSearchVM
     * Uses request ID counter to ignore stale responses
     */
    class MockGlobalSearchVM {
        public requestId = 0
        public searchResult: any = null
        public loadMoreing = false
        public loadFinish = false
        public limit = 20

        /**
         * Mock search that simulates API call with configurable delay
         */
        async requestSearch(keyword: string, responseDelay: number): Promise<void> {
            this.requestId++
            const currentRequestId = this.requestId

            // Simulate API call with delay
            await new Promise(resolve => setTimeout(resolve, responseDelay))

            // Check if this request is still the latest
            if (currentRequestId !== this.requestId) {
                return // Ignore stale response
            }

            // Process response
            this.searchResult = { keyword, messages: [] }
            this.loadMoreing = false
        }
    }

    it('should ignore stale response when newer request is made', async () => {
        const vm = new MockGlobalSearchVM()

        // First request with long delay (simulating slow network)
        const firstRequest = vm.requestSearch('abc', 200)

        // Second request with shorter delay (newer search)
        await new Promise(resolve => setTimeout(resolve, 50))
        const secondRequest = vm.requestSearch('xyz', 50)

        // Wait for both to complete
        await Promise.all([firstRequest, secondRequest])

        // Only the second request's result should be stored
        expect(vm.searchResult.keyword).toBe('xyz')
    })

    it('should process response when no newer requests exist', async () => {
        const vm = new MockGlobalSearchVM()

        await vm.requestSearch('test', 10)

        expect(vm.searchResult.keyword).toBe('test')
    })

    it('should handle rapid successive requests correctly', async () => {
        const vm = new MockGlobalSearchVM()

        // Simulate rapid typing: a -> ab -> abc
        const request1 = vm.requestSearch('a', 100)
        await new Promise(resolve => setTimeout(resolve, 20))

        const request2 = vm.requestSearch('ab', 100)
        await new Promise(resolve => setTimeout(resolve, 20))

        const request3 = vm.requestSearch('abc', 100)

        // Wait for all to complete
        await Promise.all([request1, request2, request3])

        // Only the last request's result should be stored
        expect(vm.searchResult.keyword).toBe('abc')
    })

    it('should correctly track request ID increments', async () => {
        const vm = new MockGlobalSearchVM()

        expect(vm.requestId).toBe(0)

        vm.requestSearch('test1', 10)
        expect(vm.requestId).toBe(1)

        vm.requestSearch('test2', 10)
        expect(vm.requestId).toBe(2)

        vm.requestSearch('test3', 10)
        expect(vm.requestId).toBe(3)
    })

    it('should handle out-of-order responses correctly', async () => {
        const vm = new MockGlobalSearchVM()

        // First request: slow (200ms)
        const slowRequest = vm.requestSearch('slow', 200)

        // Wait a bit, then make fast request (50ms)
        await new Promise(resolve => setTimeout(resolve, 10))
        const fastRequest = vm.requestSearch('fast', 50)

        // Fast request completes first
        await fastRequest
        expect(vm.searchResult.keyword).toBe('fast')

        // Slow request completes later but should be ignored
        await slowRequest
        expect(vm.searchResult.keyword).toBe('fast') // Still 'fast', not 'slow'
    })
})
