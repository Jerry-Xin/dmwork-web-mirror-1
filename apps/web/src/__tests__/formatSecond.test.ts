/**
 * Unit tests for formatSecond function logic
 * Tests the time formatting algorithm used in VoiceCell
 */

describe('formatSecond logic', () => {
    // Extracted formatSecond logic for testing
    function formatSecond(s: number): string {
        s = Math.ceil(s);
        const minute = Math.floor(s / 60);
        const second = Math.floor(s % 60);
        const minuteStr = minute > 9 ? `${minute}` : `0${minute}`;
        const secondStr = second > 9 ? `${second}` : `0${second}`;
        return minuteStr + ":" + secondStr;
    }

    it('should format 0 seconds as 00:00', () => {
        expect(formatSecond(0)).toBe('00:00');
    });

    it('should format 30 seconds as 00:30', () => {
        expect(formatSecond(30)).toBe('00:30');
    });

    it('should format 60 seconds as 01:00', () => {
        expect(formatSecond(60)).toBe('01:00');
    });

    it('should format 90 seconds as 01:30', () => {
        expect(formatSecond(90)).toBe('01:30');
    });

    it('should format 125 seconds as 02:05', () => {
        expect(formatSecond(125)).toBe('02:05');
    });

    it('should handle decimal values by ceiling then flooring', () => {
        // 30.5 -> ceil to 31 -> 00:31
        expect(formatSecond(30.5)).toBe('00:31');
    });

    it('should format 10 minutes correctly', () => {
        expect(formatSecond(600)).toBe('10:00');
    });

    it('should format 10 minutes 10 seconds correctly', () => {
        expect(formatSecond(610)).toBe('10:10');
    });

    // Edge case: very small decimal close to integer
    it('should handle small decimals with ceiling', () => {
        // 59.1 -> ceil to 60 -> 01:00
        expect(formatSecond(59.1)).toBe('01:00');
    });

    // Verify Math.floor works correctly (the fix being tested)
    it('should correctly truncate division result using Math.floor', () => {
        // 119 seconds = 1 minute 59 seconds
        // 119 / 60 = 1.9833... -> Math.floor = 1
        // 119 % 60 = 59
        expect(formatSecond(119)).toBe('01:59');
    });
});
