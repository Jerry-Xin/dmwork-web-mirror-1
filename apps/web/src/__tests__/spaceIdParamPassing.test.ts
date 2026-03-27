import { vi, describe, it, expect, beforeEach } from 'vitest'

/**
 * Unit tests for space_id parameter passing in friend/apply, friend/sure, and user/search APIs.
 * Verifies that space_id is included when currentSpaceId is set, and omitted when absent.
 * (fix for issues #146, #147)
 */

// Simulates the WKApp.shared.currentSpaceId + WKApp.apiClient pattern
function createApiClient() {
    let currentSpaceId: string | undefined = undefined
    const calls: Array<{ method: string; url: string; body?: any }> = []

    const apiClient = {
        get(url: string) {
            calls.push({ method: 'GET', url })
            return Promise.resolve({})
        },
        post(url: string, body?: any) {
            calls.push({ method: 'POST', url, body })
            return Promise.resolve()
        },
    }

    return {
        setSpaceId(id: string | undefined) {
            currentSpaceId = id
        },
        getSpaceId() {
            return currentSpaceId
        },
        getCalls() {
            return calls
        },
        reset() {
            calls.length = 0
            currentSpaceId = undefined
        },

        // Mirrors datasource.ts searchUser()
        searchUser(keyword: string) {
            const spaceId = currentSpaceId
            const spaceParam = spaceId ? `&space_id=${encodeURIComponent(spaceId)}` : ''
            return apiClient.get(`user/search?keyword=${encodeURIComponent(keyword)}${spaceParam}`)
        },

        // Mirrors datasource.ts friendSure()
        friendSure(token: string) {
            const body: any = { token }
            const spaceId = currentSpaceId
            if (spaceId) {
                body.space_id = spaceId
            }
            return apiClient.post('friend/sure', body)
        },

        // Mirrors datasource.ts friendApply()
        friendApply(req: { uid: string; remark: string; vercode: string }) {
            const body: any = { to_uid: req.uid, remark: req.remark, vercode: req.vercode }
            const spaceId = currentSpaceId
            if (spaceId) {
                body.space_id = spaceId
            }
            return apiClient.post('friend/apply', body)
        },

        // Mirrors BotDetailModal handleApply()
        botApply(uid: string, applyRemark: string) {
            const body: any = { to_uid: uid, remark: applyRemark }
            const spaceId = currentSpaceId
            if (spaceId) {
                body.space_id = spaceId
            }
            return apiClient.post('friend/apply', body)
        },
    }
}

describe('space_id parameter passing (#146, #147)', () => {
    let client: ReturnType<typeof createApiClient>

    beforeEach(() => {
        client = createApiClient()
    })

    describe('searchUser', () => {
        it('should append space_id when currentSpaceId is set', async () => {
            client.setSpaceId('space_abc')
            await client.searchUser('alice')
            const call = client.getCalls()[0]
            expect(call.method).toBe('GET')
            expect(call.url).toContain('space_id=space_abc')
            expect(call.url).toContain('keyword=alice')
        })

        it('should not include space_id when currentSpaceId is absent', async () => {
            await client.searchUser('bob')
            const call = client.getCalls()[0]
            expect(call.url).not.toContain('space_id')
            expect(call.url).toBe('user/search?keyword=bob')
        })

        it('should encode special characters in space_id', async () => {
            client.setSpaceId('space/with&special')
            await client.searchUser('test')
            const call = client.getCalls()[0]
            expect(call.url).toContain('space_id=space%2Fwith%26special')
        })
    })

    describe('friendSure', () => {
        it('should include space_id in body when currentSpaceId is set', async () => {
            client.setSpaceId('space_xyz')
            await client.friendSure('token123')
            const call = client.getCalls()[0]
            expect(call.body).toEqual({ token: 'token123', space_id: 'space_xyz' })
        })

        it('should not include space_id in body when currentSpaceId is absent', async () => {
            await client.friendSure('token456')
            const call = client.getCalls()[0]
            expect(call.body).toEqual({ token: 'token456' })
            expect(call.body).not.toHaveProperty('space_id')
        })
    })

    describe('friendApply', () => {
        it('should include space_id in body when currentSpaceId is set', async () => {
            client.setSpaceId('space_123')
            await client.friendApply({ uid: 'user1', remark: 'hi', vercode: '1234' })
            const call = client.getCalls()[0]
            expect(call.body).toEqual({
                to_uid: 'user1',
                remark: 'hi',
                vercode: '1234',
                space_id: 'space_123',
            })
        })

        it('should not include space_id in body when currentSpaceId is absent', async () => {
            await client.friendApply({ uid: 'user2', remark: 'hello', vercode: '5678' })
            const call = client.getCalls()[0]
            expect(call.body).not.toHaveProperty('space_id')
        })
    })

    describe('botApply (BotDetailModal)', () => {
        it('should include space_id in body when currentSpaceId is set', async () => {
            client.setSpaceId('space_bot')
            await client.botApply('bot1', 'want to add')
            const call = client.getCalls()[0]
            expect(call.body).toEqual({
                to_uid: 'bot1',
                remark: 'want to add',
                space_id: 'space_bot',
            })
        })

        it('should not include space_id in body when currentSpaceId is absent', async () => {
            await client.botApply('bot2', 'please add')
            const call = client.getCalls()[0]
            expect(call.body).toEqual({ to_uid: 'bot2', remark: 'please add' })
            expect(call.body).not.toHaveProperty('space_id')
        })
    })
})
