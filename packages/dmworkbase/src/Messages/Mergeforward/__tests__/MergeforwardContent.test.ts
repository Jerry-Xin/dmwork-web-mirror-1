import { describe, it, expect, vi } from 'vitest'

// Mock wukongimjssdk to avoid pulling in the full SDK runtime.
class StubMessageContent {
    contentObj: any
    contentType: number = 0
    encodeJSON(): any { return {} }
    decode(_: Uint8Array) { /* noop — content retained via decodeJSON fallback */ }
    get conversationDigest() { return '' }
}

class StubMessage {
    messageID: string = ''
    timestamp: number = 0
    fromUID: string = ''
    content: any
}

const getMessageContent = vi.fn(() => {
    const c = new StubMessageContent()
    // simulate decode() populating contentObj from raw payload
    c.decode = (raw: Uint8Array) => {
        try {
            c.contentObj = JSON.parse(new TextDecoder().decode(raw))
            c.contentType = c.contentObj?.type ?? 0
        } catch (_e) {
            c.contentObj = {}
        }
    }
    return c
})

vi.mock('wukongimjssdk', () => ({
    Channel: class {
        channelID: string
        channelType: number
        constructor(channelID: string, channelType: number) {
            this.channelID = channelID
            this.channelType = channelType
        }
    },
    ChannelTypeGroup: 2,
    ChannelTypePerson: 1,
    Message: StubMessage,
    MessageContent: StubMessageContent,
    WKSDK: { shared: () => ({ getMessageContent, channelManager: { getChannelInfo: () => undefined, fetchChannelInfo: () => undefined, addListener: vi.fn(), removeListener: vi.fn() } }) },
}))

// Don't import the full component module; only the content class is under test.
// The component module also imports React/UI that's not needed here, so stub them.
vi.mock('../../../Components/MergeforwardMessageList', () => ({ default: () => null }))
vi.mock('../../Base', () => ({ default: () => null }))
vi.mock('../../Base/tail', () => ({ default: () => null }))
vi.mock('../../MessageCell', () => ({ MessageCell: class {} }))
vi.mock('../../../ui/message/MessageRow', () => ({ default: () => null }))
vi.mock('../../../ui/message/MergeforwardCard', () => ({ default: () => null }))
vi.mock('../../../bridge/message/useMergeforwardMessageUI', () => ({ getMergeforwardMessageUI: () => null }))
vi.mock('../../../Components/WKModal', () => ({ default: () => null }))
vi.mock('../index.css', () => ({}))

import MergeforwardContent from '../index'

describe('MergeforwardContent users external fields', () => {
    it('decodeJSON preserves is_external and source_space_name', () => {
        const content = new MergeforwardContent()
        content.decodeJSON({
            channel_type: 2,
            users: [
                { uid: 'u1', name: 'Alice' },
                { uid: 'u2', name: 'Bob', is_external: 1, source_space_name: 'MlampWork' },
            ],
            msgs: [],
        })
        expect(content.users).toHaveLength(2)
        expect(content.users[0]).toEqual({ uid: 'u1', name: 'Alice' })
        expect(content.users[0]).not.toHaveProperty('is_external')
        expect(content.users[0]).not.toHaveProperty('source_space_name')
        expect(content.users[1]).toEqual({
            uid: 'u2',
            name: 'Bob',
            is_external: 1,
            source_space_name: 'MlampWork',
        })
    })

    it('decodeJSON drops empty source_space_name but keeps is_external flag', () => {
        const content = new MergeforwardContent()
        content.decodeJSON({
            channel_type: 2,
            users: [
                { uid: 'u3', name: 'Carol', is_external: 0, source_space_name: '' },
            ],
            msgs: [],
        })
        expect(content.users).toHaveLength(1)
        expect(content.users[0].is_external).toBe(0)
        expect(content.users[0]).not.toHaveProperty('source_space_name')
    })

    it('decodeJSON deduplicates users by uid (preserves first occurrence)', () => {
        const content = new MergeforwardContent()
        content.decodeJSON({
            channel_type: 2,
            users: [
                { uid: 'u1', name: 'Alice', is_external: 1, source_space_name: 'Space-A' },
                { uid: 'u1', name: 'Alice (dup)' },
            ],
            msgs: [],
        })
        expect(content.users).toHaveLength(1)
        expect(content.users[0]).toEqual({
            uid: 'u1',
            name: 'Alice',
            is_external: 1,
            source_space_name: 'Space-A',
        })
    })

    it('encodeJSON round-trips external fields', () => {
        const users = [
            { uid: 'u1', name: 'Alice' },
            { uid: 'u2', name: 'Bob', is_external: 1, source_space_name: 'MlampWork' },
        ]
        const content = new MergeforwardContent(2, users, [])
        const encoded = content.encodeJSON()
        expect(encoded.channel_type).toBe(2)
        expect(encoded.users).toEqual(users)
        expect(encoded.msgs).toEqual([])
    })
})
