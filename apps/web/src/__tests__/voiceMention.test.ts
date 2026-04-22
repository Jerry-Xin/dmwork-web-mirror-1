/**
 * Tests for voice transcription @mention parsing:
 * - parseMentionMarkers: converts ASR "@name" markers to Tiptap mention nodes
 * - End-to-end: parseMentionMarkers → extractMentionsFromEditor → formatMentionTextV2
 */

// ─── Type definitions (mirroring production code) ────────────────

interface MemberInfo {
    uid: string
    name: string
}

interface MentionEntity {
    uid: string
    offset: number
    length: number
}

class MentionModel {
    all: boolean = false
    uids?: Array<string>
    entities?: MentionEntity[]
}

// ─── Extracted functions (mirroring production code) ─────────────

function parseMentionMarkers(
    text: string,
    members: MemberInfo[]
): Array<{ type: string; text?: string; attrs?: { id: string; label: string } }> {
    const result: Array<{ type: string; text?: string; attrs?: { id: string; label: string } }> = []
    const regex = /@(\S+?)(?=\s|$)/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
        const name = match[1]
        const matchStart = match.index

        if (matchStart > lastIndex) {
            result.push({ type: 'text', text: text.slice(lastIndex, matchStart) })
        }

        const isAll = name === '所有人' || name.toLowerCase() === 'all' || name.toLowerCase() === 'everyone'
        const member = !isAll ? members.find(m => m.name === name) : undefined

        if (member) {
            result.push({
                type: 'mention',
                attrs: { id: member.uid, label: member.name },
            })
            result.push({ type: 'text', text: ' ' })
        } else if (isAll) {
            result.push({
                type: 'mention',
                attrs: { id: '-1', label: '所有人' },
            })
            result.push({ type: 'text', text: ' ' })
        } else {
            result.push({ type: 'text', text: match[0] })
        }

        lastIndex = match.index + match[0].length
        if (member || isAll) {
            if (lastIndex < text.length && /\s/.test(text[lastIndex])) {
                lastIndex++
            }
        }
    }

    if (lastIndex < text.length) {
        result.push({ type: 'text', text: text.slice(lastIndex) })
    }

    return result
}

function formatMentionTextV2(text: string): {
    content: string;
    mention: MentionModel | undefined;
} {
    const entities: MentionEntity[] = [];
    const uids: string[] = [];
    let result = '';
    let cursor = 0;
    let all = false;

    const placeholderPattern = /@\[([^:\]]+):([^\]]+)\]/g;
    let match;

    while ((match = placeholderPattern.exec(text)) !== null) {
        const uid = match[1];
        const name = match[2];

        result += text.substring(cursor, match.index);

        if (uid === '-1') {
            all = true;
            const atName = `@${name}`;
            result += atName;
        } else {
            const atName = `@${name}`;
            const offset = result.length;
            result += atName;

            entities.push({ uid, offset, length: atName.length });
            uids.push(uid);
        }

        cursor = match.index + match[0].length;
    }

    result += text.substring(cursor);

    if (all) {
        const mention = new MentionModel();
        mention.all = true;
        return { content: result, mention };
    }

    if (entities.length === 0) {
        return { content: result, mention: undefined };
    }

    const mention = new MentionModel();
    mention.uids = uids;
    mention.entities = entities;
    return { content: result, mention };
}

// Simulates extractMentionsFromEditor traversal on a Tiptap JSON doc
function extractMentionsFromJSON(doc: any): string {
    let result = ''

    function traverse(node: any) {
        if (node.type === 'text') {
            result += node.text
        } else if (node.type === 'mention') {
            const uid = node.attrs.id
            const label = node.attrs.label
            result += `@[${uid}:${label}]`
        } else if (node.type === 'hardBreak') {
            result += '\n'
        } else if (node.content) {
            node.content.forEach(traverse)
        }
    }

    if (doc.content) {
        doc.content.forEach((block: any, i: number) => {
            if (i > 0) result += '\n'
            traverse(block)
        })
    }

    return result
}

// ─── Tests ───────────────────────────────────────────────────────

describe('parseMentionMarkers', () => {
    const members: MemberInfo[] = [
        { uid: 'uid_chen', name: '陈皮皮' },
        { uid: 'uid_bob', name: 'Bob' },
        { uid: 'uid_alice', name: 'Alice' },
    ]

    it('should parse single mention', () => {
        const result = parseMentionMarkers('@陈皮皮 看一下', members)
        expect(result).toEqual([
            { type: 'mention', attrs: { id: 'uid_chen', label: '陈皮皮' } },
            { type: 'text', text: ' ' },
            { type: 'text', text: '看一下' },
        ])
    })

    it('should parse multiple mentions', () => {
        const result = parseMentionMarkers('@陈皮皮 和 @Bob 请看下', members)
        const mentions = result.filter(n => n.type === 'mention')
        expect(mentions).toHaveLength(2)
        expect(mentions[0].attrs).toEqual({ id: 'uid_chen', label: '陈皮皮' })
        expect(mentions[1].attrs).toEqual({ id: 'uid_bob', label: 'Bob' })
    })

    it('should keep unmatched @name as plain text', () => {
        const result = parseMentionMarkers('@不存在的人 hello', members)
        expect(result).toEqual([
            { type: 'text', text: '@不存在的人' },
            { type: 'text', text: ' hello' },
        ])
    })

    it('should handle @所有人', () => {
        const result = parseMentionMarkers('@所有人 注意', members)
        expect(result[0]).toEqual({
            type: 'mention',
            attrs: { id: '-1', label: '所有人' },
        })
    })

    it('should handle @all (English)', () => {
        const result = parseMentionMarkers('@all check this', members)
        expect(result[0]).toEqual({
            type: 'mention',
            attrs: { id: '-1', label: '所有人' },
        })
    })

    it('should handle @everyone (English)', () => {
        const result = parseMentionMarkers('@everyone check this', members)
        expect(result[0]).toEqual({
            type: 'mention',
            attrs: { id: '-1', label: '所有人' },
        })
    })

    it('should return plain text when no @markers', () => {
        const result = parseMentionMarkers('今天天气不错', members)
        expect(result).toEqual([{ type: 'text', text: '今天天气不错' }])
    })

    it('should handle empty members list', () => {
        const result = parseMentionMarkers('@陈皮皮 hello', [])
        expect(result[0]).toEqual({ type: 'text', text: '@陈皮皮' })
    })

    it('should still match @所有人 with empty members list', () => {
        const result = parseMentionMarkers('@所有人 注意', [])
        expect(result[0]).toEqual({
            type: 'mention',
            attrs: { id: '-1', label: '所有人' },
        })
    })

    it('should handle @mention at end of text', () => {
        const result = parseMentionMarkers('请看 @Bob', members)
        const mentions = result.filter(n => n.type === 'mention')
        expect(mentions).toHaveLength(1)
        expect(mentions[0].attrs?.id).toBe('uid_bob')
    })

    it('should handle empty text', () => {
        const result = parseMentionMarkers('', members)
        expect(result).toEqual([])
    })

    it('should handle mixed matched and unmatched mentions', () => {
        const result = parseMentionMarkers('@陈皮皮 和 @不存在 请看', members)
        const mentions = result.filter(n => n.type === 'mention')
        expect(mentions).toHaveLength(1)
        expect(mentions[0].attrs?.id).toBe('uid_chen')
        const texts = result.filter(n => n.type === 'text').map(n => n.text)
        expect(texts).toContain('@不存在')
    })

    it('should handle text with leading content before mention', () => {
        const result = parseMentionMarkers('你好 @陈皮皮 请看下', members)
        expect(result[0]).toEqual({ type: 'text', text: '你好 ' })
        expect(result[1]).toEqual({ type: 'mention', attrs: { id: 'uid_chen', label: '陈皮皮' } })
        expect(result[2]).toEqual({ type: 'text', text: ' ' })
        expect(result[3]).toEqual({ type: 'text', text: '请看下' })
    })

    it('should not produce double spaces after matched mention', () => {
        const result = parseMentionMarkers('@Bob hello', members)
        // Should be: mention, space, "hello" — not mention, space, space, "hello"
        expect(result).toEqual([
            { type: 'mention', attrs: { id: 'uid_bob', label: 'Bob' } },
            { type: 'text', text: ' ' },
            { type: 'text', text: 'hello' },
        ])
    })

    it('should handle @mention with special chars that do not match', () => {
        const result = parseMentionMarkers('@user@domain.com 看看', members)
        // @user@domain.com is treated as a single non-whitespace token
        expect(result[0]).toEqual({ type: 'text', text: '@user@domain.com' })
    })

    it('should match first member when duplicate names exist', () => {
        const dupeMembers: MemberInfo[] = [
            { uid: 'uid_a', name: '张三' },
            { uid: 'uid_b', name: '张三' },
        ]
        const result = parseMentionMarkers('@张三 看一下', dupeMembers)
        const mentions = result.filter(n => n.type === 'mention')
        expect(mentions).toHaveLength(1)
        expect(mentions[0].attrs?.id).toBe('uid_a')
    })
})

describe('voice mention end-to-end', () => {
    const members: MemberInfo[] = [
        { uid: 'uid_chen', name: '陈皮皮' },
        { uid: 'uid_bob', name: 'Bob' },
    ]

    it('single mention should produce correct entities via send pipeline', () => {
        const nodes = parseMentionMarkers('你好 @陈皮皮 请看下', members)

        // Simulate what the editor would produce as JSON
        const editorJSON = {
            type: 'doc',
            content: [{ type: 'paragraph', content: nodes }],
        }

        const extracted = extractMentionsFromJSON(editorJSON)
        expect(extracted).toBe('你好 @[uid_chen:陈皮皮] 请看下')

        const { content, mention } = formatMentionTextV2(extracted)
        expect(content).toBe('你好 @陈皮皮 请看下')
        expect(mention?.entities).toEqual([
            { uid: 'uid_chen', offset: 3, length: 4 },
        ])
    })

    it('multiple mentions should produce correct entities', () => {
        const nodes = parseMentionMarkers('@陈皮皮 和 @Bob 请看下', members)

        const editorJSON = {
            type: 'doc',
            content: [{ type: 'paragraph', content: nodes }],
        }

        const extracted = extractMentionsFromJSON(editorJSON)
        const { content, mention } = formatMentionTextV2(extracted)

        expect(content).toBe('@陈皮皮 和 @Bob 请看下')
        expect(mention?.entities).toHaveLength(2)
        expect(mention?.entities?.[0].uid).toBe('uid_chen')
        expect(mention?.entities?.[1].uid).toBe('uid_bob')
    })

    it('@所有人 should set mention.all = true', () => {
        const nodes = parseMentionMarkers('@所有人 注意', members)

        const editorJSON = {
            type: 'doc',
            content: [{ type: 'paragraph', content: nodes }],
        }

        const extracted = extractMentionsFromJSON(editorJSON)
        const { content, mention } = formatMentionTextV2(extracted)

        expect(content).toBe('@所有人 注意')
        expect(mention?.all).toBe(true)
    })

    it('unmatched @mention should pass through as plain text', () => {
        const nodes = parseMentionMarkers('@不存在 hello', members)

        const editorJSON = {
            type: 'doc',
            content: [{ type: 'paragraph', content: nodes }],
        }

        const extracted = extractMentionsFromJSON(editorJSON)
        expect(extracted).toBe('@不存在 hello')

        const { content, mention } = formatMentionTextV2(extracted)
        expect(content).toBe('@不存在 hello')
        expect(mention).toBeUndefined()
    })

    it('mixed matched and unmatched mentions', () => {
        const nodes = parseMentionMarkers('@陈皮皮 和 @不存在 请看', members)

        const editorJSON = {
            type: 'doc',
            content: [{ type: 'paragraph', content: nodes }],
        }

        const extracted = extractMentionsFromJSON(editorJSON)
        const { content, mention } = formatMentionTextV2(extracted)

        expect(content).toBe('@陈皮皮 和 @不存在 请看')
        expect(mention?.entities).toHaveLength(1)
        expect(mention?.entities?.[0].uid).toBe('uid_chen')
    })
})
