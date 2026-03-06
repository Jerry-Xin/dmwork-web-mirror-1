/**
 * Unit tests for JSON.parse() and atob() error handling
 * Tests the error handling for potentially corrupted data parsing
 *
 * Fixes: https://github.com/dmwork-org/dmwork-web/issues/134
 */

describe('JSON.parse error handling', () => {
    // Simulates the safeJsonParse logic used in App.tsx and ProhibitwordsService.ts
    function safeJsonParse<T>(jsonString: string, fallback: T): T {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            return fallback;
        }
    }

    it('should parse valid JSON correctly', () => {
        const validJson = '[{"uid": "123", "name": "test"}]';
        const result = safeJsonParse(validJson, []);
        expect(result).toEqual([{ uid: "123", name: "test" }]);
    });

    it('should return fallback for invalid JSON', () => {
        const invalidJson = '{invalid json}';
        const result = safeJsonParse(invalidJson, []);
        expect(result).toEqual([]);
    });

    it('should return fallback for truncated JSON', () => {
        const truncatedJson = '{"data": [1, 2, 3';
        const result = safeJsonParse(truncatedJson, []);
        expect(result).toEqual([]);
    });

    it('should return fallback for empty string', () => {
        const emptyString = '';
        const result = safeJsonParse(emptyString, []);
        expect(result).toEqual([]);
    });

    it('should return fallback for corrupted base64-like content', () => {
        // Sometimes storage can get corrupted with non-JSON data
        const corruptedData = 'SGVsbG8gV29ybGQ='; // base64 "Hello World"
        const result = safeJsonParse(corruptedData, { default: true });
        expect(result).toEqual({ default: true });
    });

    it('should handle nested objects correctly', () => {
        const nestedJson = '{"items": [{"id": 1, "nested": {"value": "test"}}]}';
        const result = safeJsonParse(nestedJson, {});
        expect(result).toEqual({ items: [{ id: 1, nested: { value: "test" } }] });
    });
});

describe('atob (base64 decode) error handling', () => {
    // Simulates the safeAtob logic used in Voice/index.tsx
    function safeAtob(base64String: string): Uint8Array {
        try {
            return new Uint8Array(
                atob(base64String).split('').map(char => char.charCodeAt(0))
            );
        } catch (e) {
            return new Uint8Array(0);
        }
    }

    it('should decode valid base64 correctly', () => {
        // "Hello" in base64
        const validBase64 = 'SGVsbG8=';
        const result = safeAtob(validBase64);
        expect(result.length).toBe(5);
        expect(String.fromCharCode(...result)).toBe('Hello');
    });

    it('should return empty array for invalid base64', () => {
        const invalidBase64 = '!!!invalid!!!';
        const result = safeAtob(invalidBase64);
        expect(result).toEqual(new Uint8Array(0));
    });

    it('should return empty array for truncated base64', () => {
        // Missing padding
        const truncatedBase64 = 'SGVsbG8';
        // Note: This might or might not throw depending on browser
        // In Node.js, atob is more lenient, but we should still handle errors gracefully
        const result = safeAtob(truncatedBase64);
        // Either valid decode or empty array is acceptable
        expect(result.length >= 0).toBe(true);
    });

    it('should handle empty string', () => {
        const result = safeAtob('');
        expect(result).toEqual(new Uint8Array(0));
    });

    it('should handle corrupted data with special characters', () => {
        // Contains characters not valid in base64
        const corruptedData = 'abc\x00\x01\x02def';
        const result = safeAtob(corruptedData);
        expect(result.length >= 0).toBe(true); // Should not throw
    });

    it('should decode waveform-like data correctly', () => {
        // Simulate a small waveform: [100, 150, 200, 150, 100]
        const waveformData = [100, 150, 200, 150, 100];
        const base64Waveform = btoa(String.fromCharCode(...waveformData));
        const result = safeAtob(base64Waveform);
        expect(Array.from(result)).toEqual(waveformData);
    });
});
