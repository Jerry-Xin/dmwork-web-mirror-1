/**
 * Tests for the mention refactor:
 * - formatMentionTextV2: converts @[uid:name] markup to @name + entities
 * - parseMentionWithEntities: renders mentions using entities (v2)
 * - parseMentionLegacy: renders mentions using uids + regex (v1 fallback)
 */

// ─── Type definitions ────────────────────────────────────────────

interface MentionEntity {
    uid: string;
    offset: number;
    length: number;
}

enum PartType {
    text,
    emoji,
    mention,
    link,
}

class Part {
    type!: PartType
    text!: string
    data?: any
    constructor(type: PartType, text: string, data?: any) {
        this.type = type
        this.text = text
        this.data = data
    }
}

class MentionModel {
    all: boolean = false
    uids?: Array<string>
    entities?: MentionEntity[]
}

// ─── Extracted functions (mirroring production code) ─────────────

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

function parseMentionWithEntities(
    text: string,
    entities: Array<{ uid: string; offset: number; length: number }>
): Part[] | null {
    const validEntities = entities
        .filter(
            (e): e is { uid: string; offset: number; length: number } =>
                e != null &&
                typeof e === 'object' &&
                !Array.isArray(e) &&
                typeof e.uid === 'string' &&
                typeof e.offset === 'number' &&
                typeof e.length === 'number' &&
                Number.isFinite(e.offset) &&
                Number.isFinite(e.length) &&
                e.offset >= 0 &&
                e.length > 0 &&
                e.offset + e.length <= text.length
        )
        .sort((a, b) => a.offset - b.offset);

    if (validEntities.length === 0) {
        return null;
    }

    const deduped: Array<{ uid: string; offset: number; length: number }> = [];
    let lastEnd = 0;
    for (const entity of validEntities) {
        if (entity.offset >= lastEnd) {
            deduped.push(entity);
            lastEnd = entity.offset + entity.length;
        }
    }

    const parts: Part[] = [];
    let cursor = 0;

    for (const entity of deduped) {
        if (entity.offset > cursor) {
            parts.push(new Part(PartType.text, text.substring(cursor, entity.offset)));
        }

        const mentionText = text.substring(entity.offset, entity.offset + entity.length);

        if (!mentionText.startsWith('@')) {
            parts.push(new Part(PartType.text, mentionText));
            cursor = entity.offset + entity.length;
            continue;
        }

        parts.push(new Part(PartType.mention, mentionText, { uid: entity.uid }));
        cursor = entity.offset + entity.length;
    }

    if (cursor < text.length) {
        parts.push(new Part(PartType.text, text.substring(cursor)));
    }

    return parts;
}

function parseMentionLegacy(text: string, uids: string[]): Part[] {
    const parts: Part[] = [];
    const mentionRegex = /@[\w\u4e00-\u9fa5.\-]+/gm;
    let match: RegExpExecArray | null;
    let cursor = 0;
    let i = 0;

    while ((match = mentionRegex.exec(text)) !== null && i < uids.length) {
        const matchStart = match.index;
        const matchText = match[0];

        if (matchStart > 0) {
            const charBefore = text.charCodeAt(matchStart - 1);
            if (
                (charBefore >= 97 && charBefore <= 122) ||
                (charBefore >= 65 && charBefore <= 90) ||
                (charBefore >= 48 && charBefore <= 57) ||
                charBefore === 95
            ) {
                continue;
            }
        }

        if (matchStart > cursor) {
            parts.push(new Part(PartType.text, text.substring(cursor, matchStart)));
        }

        const data = i < uids.length ? { uid: uids[i] } : {};
        parts.push(new Part(PartType.mention, matchText, data));
        cursor = matchStart + matchText.length;
        i++;
    }

    if (cursor < text.length) {
        parts.push(new Part(PartType.text, text.substring(cursor)));
    }

    return parts;
}

// ─── parseMention dispatcher (mirrors Model.tsx logic) ──────────

function parseMention(
    text: string,
    mention?: { uids?: string[]; entities?: any[]; all?: boolean }
): Part[] {
    if (!mention) {
        return [new Part(PartType.text, text)];
    }

    if (mention.entities && Array.isArray(mention.entities)) {
        const result = parseMentionWithEntities(text, mention.entities);
        if (result !== null) return result;
    }

    if (mention.uids && Array.isArray(mention.uids) && mention.uids.length > 0) {
        return parseMentionLegacy(text, mention.uids);
    }

    return [new Part(PartType.text, text)];
}

// ═════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════

describe('formatMentionTextV2', () => {
    it('should convert @[uid:name] to @name and generate entities', () => {
        const input = '你好 @[uid_chen:陈皮皮] 请看下';
        const result = formatMentionTextV2(input);

        expect(result.content).toBe('你好 @陈皮皮 请看下');
        expect(result.mention?.entities).toEqual([
            { uid: 'uid_chen', offset: 3, length: 4 },
        ]);
        expect(result.mention?.uids).toEqual(['uid_chen']);
    });

    it('should handle multiple mentions', () => {
        const input = '你好 @[uid_chen:陈皮皮] 和 @[uid_bob:Bob] 请看下';
        const result = formatMentionTextV2(input);

        expect(result.content).toBe('你好 @陈皮皮 和 @Bob 请看下');
        expect(result.mention?.entities).toEqual([
            { uid: 'uid_chen', offset: 3, length: 4 },
            { uid: 'uid_bob', offset: 10, length: 4 },
        ]);
        expect(result.mention?.uids).toEqual(['uid_chen', 'uid_bob']);
    });

    it('should handle two same-name users with different uids', () => {
        const input = '你好 @[uid_a:陈皮皮] 和 @[uid_b:陈皮皮] ';
        const result = formatMentionTextV2(input);

        expect(result.content).toBe('你好 @陈皮皮 和 @陈皮皮 ');
        expect(result.mention?.entities).toEqual([
            { uid: 'uid_a', offset: 3, length: 4 },
            { uid: 'uid_b', offset: 10, length: 4 },
        ]);
        expect(result.mention?.uids).toEqual(['uid_a', 'uid_b']);
    });

    it('should handle @everyone (uid = -1)', () => {
        const input = '大家注意 @[-1:所有人] ';
        const result = formatMentionTextV2(input);

        expect(result.content).toBe('大家注意 @所有人 ');
        expect(result.mention?.all).toBe(true);
        expect(result.mention?.entities).toBeUndefined();
    });

    it('should return undefined mention when no mentions', () => {
        const input = '普通消息';
        const result = formatMentionTextV2(input);

        expect(result.content).toBe('普通消息');
        expect(result.mention).toBeUndefined();
    });

    it('should handle mention at end without trailing space', () => {
        const input = '你好 @[uid_chen:陈皮皮]';
        const result = formatMentionTextV2(input);

        expect(result.content).toBe('你好 @陈皮皮');
        expect(result.mention?.entities).toEqual([
            { uid: 'uid_chen', offset: 3, length: 4 },
        ]);
    });

    it('should handle mention at start', () => {
        const input = '@[uid_chen:陈皮皮] 你好';
        const result = formatMentionTextV2(input);

        expect(result.content).toBe('@陈皮皮 你好');
        expect(result.mention?.entities).toEqual([
            { uid: 'uid_chen', offset: 0, length: 4 },
        ]);
    });

    it('offset/length should match UTF-16 code units (JS string.length)', () => {
        const input = '@[uid_chen:陈皮皮] ok';
        const result = formatMentionTextV2(input);
        const entity = result.mention!.entities![0];

        expect(result.content.substring(entity.offset, entity.offset + entity.length)).toBe('@陈皮皮');
    });

    it('should handle mixed @everyone and normal mentions', () => {
        const input = '@[-1:所有人] @[uid_bob:Bob] ';
        const result = formatMentionTextV2(input);

        expect(result.content).toBe('@所有人 @Bob ');
        // When @everyone is present, mention.all = true takes priority
        expect(result.mention?.all).toBe(true);
    });
});

describe('parseMentionWithEntities', () => {
    it('should parse a single mention', () => {
        const text = '你好 @陈皮皮 请看下';
        const entities = [{ uid: 'uid_chen', offset: 3, length: 4 }];
        const parts = parseMentionWithEntities(text, entities);

        expect(parts).not.toBeNull();
        expect(parts).toHaveLength(3);
        expect(parts![0]).toEqual(new Part(PartType.text, '你好 '));
        expect(parts![1]).toEqual(new Part(PartType.mention, '@陈皮皮', { uid: 'uid_chen' }));
        expect(parts![2]).toEqual(new Part(PartType.text, ' 请看下'));
    });

    it('should parse multiple mentions', () => {
        const text = '你好 @陈皮皮 和 @Bob 请看下';
        const entities = [
            { uid: 'uid_chen', offset: 3, length: 4 },
            { uid: 'uid_bob', offset: 10, length: 4 },
        ];
        const parts = parseMentionWithEntities(text, entities);

        expect(parts).toHaveLength(5);
        expect(parts![1].data.uid).toBe('uid_chen');
        expect(parts![3].data.uid).toBe('uid_bob');
    });

    it('should handle same-name users with different uids', () => {
        const text = '请 @陈皮皮 和 @陈皮皮 一起看下';
        const entities = [
            { uid: 'uid_chen_a', offset: 2, length: 4 },
            { uid: 'uid_chen_b', offset: 9, length: 4 },
        ];
        const parts = parseMentionWithEntities(text, entities);

        expect(parts![1].data.uid).toBe('uid_chen_a');
        expect(parts![3].data.uid).toBe('uid_chen_b');
    });

    it('should skip entity with offset beyond text length', () => {
        const text = '你好';
        const entities = [{ uid: 'uid', offset: 100, length: 4 }];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toBeNull();
    });

    it('should skip entity with length 0', () => {
        const text = '@Bob hello';
        const entities = [{ uid: 'uid', offset: 0, length: 0 }];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toBeNull();
    });

    it('should skip entity with negative offset', () => {
        const text = '@Bob hello';
        const entities = [{ uid: 'uid', offset: -1, length: 4 }];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toBeNull();
    });

    it('should skip entity with NaN offset', () => {
        const text = '@Bob hello';
        const entities = [{ uid: 'uid', offset: NaN, length: 4 }];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toBeNull();
    });

    it('should skip entity with Infinity length', () => {
        const text = '@Bob hello';
        const entities = [{ uid: 'uid', offset: 0, length: Infinity }];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toBeNull();
    });

    it('should skip null entries in entities array', () => {
        const text = '你好 @Bob';
        const entities = [null, { uid: 'uid', offset: 3, length: 4 }] as any;
        const result = parseMentionWithEntities(text, entities);

        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
        expect(result![1].data.uid).toBe('uid');
    });

    it('should keep first entity when overlapping', () => {
        const text = '@BobSmith hello';
        const entities = [
            { uid: 'uid1', offset: 0, length: 9 },
            { uid: 'uid2', offset: 4, length: 5 },
        ];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toHaveLength(2);
        expect(result![0].data.uid).toBe('uid1');
    });

    it('should treat non-@ starting text as plain text', () => {
        const text = 'Hello World';
        const entities = [{ uid: 'uid', offset: 0, length: 5 }];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toHaveLength(2);
        expect(result![0].type).toBe(PartType.text);
        expect(result![0].text).toBe('Hello');
    });

    it('should return null when all entities are invalid', () => {
        const text = '@Bob hello';
        const entities = [{}] as any;
        const result = parseMentionWithEntities(text, entities);

        expect(result).toBeNull();
    });

    it('should handle mention at start of text', () => {
        const text = '@Bob hello';
        const entities = [{ uid: 'uid_bob', offset: 0, length: 4 }];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toHaveLength(2);
        expect(result![0]).toEqual(new Part(PartType.mention, '@Bob', { uid: 'uid_bob' }));
        expect(result![1]).toEqual(new Part(PartType.text, ' hello'));
    });

    it('should handle mention at end of text', () => {
        const text = 'hello @Bob';
        const entities = [{ uid: 'uid_bob', offset: 6, length: 4 }];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toHaveLength(2);
        expect(result![0]).toEqual(new Part(PartType.text, 'hello '));
        expect(result![1]).toEqual(new Part(PartType.mention, '@Bob', { uid: 'uid_bob' }));
    });

    it('should handle offset+length exactly at text boundary', () => {
        const text = '@Bob';
        const entities = [{ uid: 'uid_bob', offset: 0, length: 4 }];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toHaveLength(1);
        expect(result![0]).toEqual(new Part(PartType.mention, '@Bob', { uid: 'uid_bob' }));
    });

    it('should sort entities by offset', () => {
        const text = '@Alice and @Bob';
        const entities = [
            { uid: 'uid_bob', offset: 11, length: 4 },
            { uid: 'uid_alice', offset: 0, length: 6 },
        ];
        const result = parseMentionWithEntities(text, entities);

        expect(result).toHaveLength(3);
        expect(result![0].data.uid).toBe('uid_alice');
        expect(result![2].data.uid).toBe('uid_bob');
    });
});

describe('parseMentionLegacy', () => {
    it('should match Chinese usernames', () => {
        const text = '你好 @陈皮皮 请看下';
        const uids = ['uid_chen'];
        const parts = parseMentionLegacy(text, uids);

        expect(parts).toHaveLength(3);
        expect(parts[1]).toEqual(new Part(PartType.mention, '@陈皮皮', { uid: 'uid_chen' }));
    });

    it('should match usernames with dots', () => {
        const text = 'Hi @thomas.ford ok';
        const uids = ['uid_thomas'];
        const parts = parseMentionLegacy(text, uids);

        expect(parts[1].text).toBe('@thomas.ford');
        expect(parts[1].data.uid).toBe('uid_thomas');
    });

    it('should match usernames with hyphens', () => {
        const text = 'Hi @user-name ok';
        const uids = ['uid_user'];
        const parts = parseMentionLegacy(text, uids);

        expect(parts[1].text).toBe('@user-name');
    });

    it('should exclude email addresses', () => {
        const text = '发邮件到 user@company.com 看看';
        const uids = ['uid_fake'];
        const parts = parseMentionLegacy(text, uids);

        expect(parts.every((p) => p.type === PartType.text)).toBe(true);
    });

    it('should pair uids in order', () => {
        const text = '@Alice 和 @Bob';
        const uids = ['uid_alice', 'uid_bob'];
        const parts = parseMentionLegacy(text, uids);

        expect(parts[0].data.uid).toBe('uid_alice');
        expect(parts[2].data.uid).toBe('uid_bob');
    });

    it('should handle mention at end without trailing space', () => {
        const text = '你好 @Bob';
        const uids = ['uid_bob'];
        const parts = parseMentionLegacy(text, uids);

        expect(parts).toHaveLength(2);
        expect(parts[1]).toEqual(new Part(PartType.mention, '@Bob', { uid: 'uid_bob' }));
    });

    it('should handle mention at start', () => {
        const text = '@Alice hello';
        const uids = ['uid_alice'];
        const parts = parseMentionLegacy(text, uids);

        expect(parts[0]).toEqual(new Part(PartType.mention, '@Alice', { uid: 'uid_alice' }));
    });

    it('should stop pairing when uids exhausted', () => {
        const text = '@Alice @Bob @Charlie';
        const uids = ['uid_alice'];
        const parts = parseMentionLegacy(text, uids);

        const mentionParts = parts.filter((p) => p.type === PartType.mention);
        expect(mentionParts).toHaveLength(1);
        expect(mentionParts[0].data.uid).toBe('uid_alice');
    });
});

describe('parseMention dispatcher (v2 priority + v1 fallback)', () => {
    it('should use v2 path when valid entities exist', () => {
        const parts = parseMention('你好 @Bob', {
            uids: ['uid_bob'],
            entities: [{ uid: 'uid_bob', offset: 3, length: 4 }],
        });

        const mentionPart = parts.find((p) => p.type === PartType.mention);
        expect(mentionPart?.data?.uid).toBe('uid_bob');
    });

    it('should fallback to uids when entities are all invalid', () => {
        const parts = parseMention('你好 @Bob', {
            uids: ['uid_bob'],
            entities: [{}] as any,
        });

        const mentionPart = parts.find((p) => p.type === PartType.mention);
        expect(mentionPart?.data?.uid).toBe('uid_bob');
    });

    it('should fallback to uids when no entities', () => {
        const parts = parseMention('你好 @Bob', {
            uids: ['uid_bob'],
        });

        const mentionPart = parts.find((p) => p.type === PartType.mention);
        expect(mentionPart?.data?.uid).toBe('uid_bob');
    });

    it('should return plain text when no mention', () => {
        const parts = parseMention('你好世界', undefined);

        expect(parts).toHaveLength(1);
        expect(parts[0].type).toBe(PartType.text);
    });

    it('should return plain text when mention has no uids or entities', () => {
        const parts = parseMention('你好世界', {});

        expect(parts).toHaveLength(1);
        expect(parts[0].type).toBe(PartType.text);
    });
});

describe('v1 regex fix verification', () => {
    it('fixed regex should capture full Chinese name (not just last char)', () => {
        const regex = /@[\w\u4e00-\u9fa5.\-]+/gm;
        const match = regex.exec('@陈皮皮');
        expect(match).not.toBeNull();
        expect(match![0]).toBe('@陈皮皮');
    });

    it('old buggy regex quantifier issue: + outside capture group', () => {
        // The old regex: /@([\w\u4e00-\u9fa5])+/m
        // The + is outside the capture group, so match[1] is only the last char
        const oldRegex = /@([\w\u4e00-\u9fa5])+/m;
        const match = oldRegex.exec('@陈皮皮');
        // match[0] is correct (full match), but match[1] is only '皮' (bug)
        expect(match![0]).toBe('@陈皮皮');
        expect(match![1]).toBe('皮'); // demonstrates the old bug

        // The fixed regex doesn't need a capture group
        const fixedRegex = /@[\w\u4e00-\u9fa5.\-]+/gm;
        const fixedMatch = fixedRegex.exec('@陈皮皮');
        expect(fixedMatch![0]).toBe('@陈皮皮');
    });

    it('fixed regex should have /g flag for exec iteration', () => {
        const regex = /@[\w\u4e00-\u9fa5.\-]+/gm;
        const text = '@Alice and @Bob';
        const matches: string[] = [];
        let m;
        while ((m = regex.exec(text)) !== null) {
            matches.push(m[0]);
        }
        expect(matches).toEqual(['@Alice', '@Bob']);
    });

    it('fixed regex should match dots and hyphens in names', () => {
        const regex = /@[\w\u4e00-\u9fa5.\-]+/gm;
        expect(regex.exec('@thomas.ford')![0]).toBe('@thomas.ford');
        regex.lastIndex = 0;
        expect(regex.exec('@user-name')![0]).toBe('@user-name');
    });
});

describe('end-to-end: formatMentionTextV2 -> parseMentionWithEntities', () => {
    it('should produce entities that parseMentionWithEntities can render correctly', () => {
        const input = '你好 @[uid_chen:陈皮皮] 和 @[uid_bob:Bob] 请看下';
        const { content, mention } = formatMentionTextV2(input);

        const parts = parseMentionWithEntities(content, mention!.entities!);

        expect(parts).not.toBeNull();
        expect(parts).toHaveLength(5);
        expect(parts![1]).toEqual(new Part(PartType.mention, '@陈皮皮', { uid: 'uid_chen' }));
        expect(parts![3]).toEqual(new Part(PartType.mention, '@Bob', { uid: 'uid_bob' }));
    });

    it('should handle same-name users end-to-end', () => {
        const input = '请 @[uid_a:陈皮皮] 和 @[uid_b:陈皮皮] 一起看下';
        const { content, mention } = formatMentionTextV2(input);

        const parts = parseMentionWithEntities(content, mention!.entities!);

        expect(parts).not.toBeNull();
        expect(parts![1].data.uid).toBe('uid_a');
        expect(parts![3].data.uid).toBe('uid_b');
        // Both have same display text but different uids
        expect(parts![1].text).toBe('@陈皮皮');
        expect(parts![3].text).toBe('@陈皮皮');
    });
});
