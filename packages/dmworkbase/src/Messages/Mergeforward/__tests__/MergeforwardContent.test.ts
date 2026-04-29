import { describe, it, expect, vi } from 'vitest'

// Hoisted stubs are required because vi.mock is hoisted above any other code;
// referencing module-level `class` declarations inside the factory triggers
// "Cannot access ... before initialization" in vitest 4.
const hoisted = vi.hoisted(() => {
    class StubMessageContent {
        contentObj: any
        // Do not initialize contentType as a field — MergeforwardContent
        // overrides it with a getter on the prototype, and a field initializer
        // on the base class would trigger "Cannot set property contentType
        // which has only a getter" when the subclass is instantiated.
        contentType!: number
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

    return { StubMessageContent, StubMessage, getMessageContent }
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
    Message: hoisted.StubMessage,
    MessageContent: hoisted.StubMessageContent,
    WKSDK: { shared: () => ({ getMessageContent: hoisted.getMessageContent, channelManager: { getChannelInfo: () => undefined, fetchChannelInfo: () => undefined, addListener: vi.fn(), removeListener: vi.fn() } }) },
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

/**
 * dmwork-web#1069：合并转发内嵌消息的 decode 路径（mapToMessage）必须透传
 * msg-level 的外部来源字段，否则外部成员在转发历史里的消息气泡
 * header 会缺失 @SpaceName 标记。与 Convert.toMessage 行为保持一致。
 */
describe('MergeforwardContent.mapToMessage external fields (dmwork-web#1069)', () => {
    it('stashes from_is_external / from_source_space_name on inner messages', () => {
        const content = new MergeforwardContent()
        content.decodeJSON({
            channel_type: 2,
            users: [],
            msgs: [
                {
                    message_id: '1',
                    from_uid: 'u-ext',
                    timestamp: 0,
                    payload: { type: 1, content: 'hi' },
                    from_is_external: 1,
                    from_source_space_name: '测试空间1',
                },
            ],
        })
        const inner: any = content.msgs[0]
        expect(inner.fromUID).toBe('u-ext')
        expect(inner.from_is_external).toBe(1)
        expect(inner.from_source_space_name).toBe('测试空间1')
    })

    it('stashes from_home_space_id / from_home_space_name on inner messages', () => {
        const content = new MergeforwardContent()
        content.decodeJSON({
            channel_type: 2,
            users: [],
            msgs: [
                {
                    message_id: '2',
                    from_uid: 'u-ext',
                    timestamp: 0,
                    payload: { type: 1, content: 'hi' },
                    from_home_space_id: '668cc9ee13e14fd78e3c92fe0d937cd8',
                    from_home_space_name: '测试空间1',
                },
            ],
        })
        const inner: any = content.msgs[0]
        expect(inner.from_home_space_id).toBe('668cc9ee13e14fd78e3c92fe0d937cd8')
        expect(inner.from_home_space_name).toBe('测试空间1')
    })

    it('leaves fields undefined when payload omits them (backward compat)', () => {
        const content = new MergeforwardContent()
        content.decodeJSON({
            channel_type: 2,
            users: [],
            msgs: [
                {
                    message_id: '3',
                    from_uid: 'u-int',
                    timestamp: 0,
                    payload: { type: 1, content: 'hi' },
                },
            ],
        })
        const inner: any = content.msgs[0]
        expect(inner.from_is_external).toBeUndefined()
        expect(inner.from_source_space_name).toBeUndefined()
        expect(inner.from_home_space_id).toBeUndefined()
        expect(inner.from_home_space_name).toBeUndefined()
    })

    it('non-1 truthy from_is_external collapses to 0 (strict boolean semantics)', () => {
        const content = new MergeforwardContent()
        content.decodeJSON({
            channel_type: 2,
            users: [],
            msgs: [
                {
                    message_id: '4',
                    from_uid: 'u-int',
                    timestamp: 0,
                    payload: { type: 1, content: 'hi' },
                    from_is_external: 'yes',
                },
            ],
        })
        const inner: any = content.msgs[0]
        expect(inner.from_is_external).toBe(0)
    })
})
