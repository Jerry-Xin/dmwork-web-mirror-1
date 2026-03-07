/**
 * Unit tests for system tip deduplication logic
 * Ensures duplicate system messages (e.g., security warnings) within 5 minutes are suppressed.
 * Fixes dmwork-org/dmwork-web#240
 */

describe('deduplicateSystemTips', () => {
    const minIntervalSec = 300; // 5 minutes

    interface MockMessage {
        contentType: number;
        timestamp: number;
        content: { displayText?: string };
    }

    // Extracted logic matching ConversationVM.deduplicateSystemTips
    function deduplicateSystemTips(messages: MockMessage[]): MockMessage[] {
        const lastSeenMap = new Map<string, number>();
        return messages.filter((m) => {
            if (m.contentType < 1000 || m.contentType > 2000) return true;
            const text = m.content?.displayText;
            if (!text) return true;
            const lastTimestamp = lastSeenMap.get(text);
            if (lastTimestamp !== undefined && Math.abs(m.timestamp - lastTimestamp) < minIntervalSec) {
                return false;
            }
            lastSeenMap.set(text, m.timestamp);
            return true;
        });
    }

    it('should keep non-system messages unchanged', () => {
        const msgs: MockMessage[] = [
            { contentType: 1, timestamp: 100, content: { displayText: 'hello' } },
            { contentType: 2, timestamp: 101, content: { displayText: 'hello' } },
        ];
        expect(deduplicateSystemTips(msgs)).toHaveLength(2);
    });

    it('should deduplicate identical system messages within 5 minutes', () => {
        const msgs: MockMessage[] = [
            { contentType: 1005, timestamp: 1000, content: { displayText: '谨防受骗上当' } },
            { contentType: 1005, timestamp: 1060, content: { displayText: '谨防受骗上当' } },
            { contentType: 1005, timestamp: 1120, content: { displayText: '谨防受骗上当' } },
        ];
        const result = deduplicateSystemTips(msgs);
        expect(result).toHaveLength(1);
        expect(result[0].timestamp).toBe(1000);
    });

    it('should keep system messages with different content', () => {
        const msgs: MockMessage[] = [
            { contentType: 1005, timestamp: 1000, content: { displayText: '谨防受骗上当' } },
            { contentType: 1005, timestamp: 1060, content: { displayText: '其他系统提示' } },
        ];
        expect(deduplicateSystemTips(msgs)).toHaveLength(2);
    });

    it('should allow same system message after 5 minute gap', () => {
        const msgs: MockMessage[] = [
            { contentType: 1005, timestamp: 1000, content: { displayText: '谨防受骗上当' } },
            { contentType: 1005, timestamp: 1301, content: { displayText: '谨防受骗上当' } },
        ];
        expect(deduplicateSystemTips(msgs)).toHaveLength(2);
    });

    it('should handle mixed system and normal messages', () => {
        const msgs: MockMessage[] = [
            { contentType: 1, timestamp: 1000, content: { displayText: 'text msg' } },
            { contentType: 1005, timestamp: 1010, content: { displayText: '谨防受骗上当' } },
            { contentType: 1, timestamp: 1020, content: { displayText: 'another text' } },
            { contentType: 1005, timestamp: 1030, content: { displayText: '谨防受骗上当' } },
        ];
        const result = deduplicateSystemTips(msgs);
        expect(result).toHaveLength(3); // 2 text + 1 system
    });
});
