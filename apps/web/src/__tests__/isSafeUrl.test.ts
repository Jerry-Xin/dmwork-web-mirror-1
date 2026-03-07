/**
 * Unit tests for isSafeUrl URL protocol validation
 * Tests the URL validation logic to prevent malicious URL protocols
 *
 * Fixes: https://github.com/dmwork-org/dmwork-web/issues/136
 * Fixes: https://github.com/dmwork-org/dmwork-web/issues/274
 */

// Import the shared isSafeUrl function from dmworkbase package
import { isSafeUrl } from '../../../../packages/dmworkbase/src/Utils/security';

describe('isSafeUrl URL protocol validation', () => {

    describe('valid URLs (should return true)', () => {
        it('should accept https:// URLs', () => {
            expect(isSafeUrl('https://example.com')).toBe(true);
            expect(isSafeUrl('https://example.com/path')).toBe(true);
            expect(isSafeUrl('https://example.com:8080/path?query=1')).toBe(true);
        });

        it('should accept http:// URLs', () => {
            expect(isSafeUrl('http://example.com')).toBe(true);
            expect(isSafeUrl('http://localhost:3000')).toBe(true);
            expect(isSafeUrl('http://192.168.1.1/api')).toBe(true);
        });
    });

    describe('dangerous URLs (should return false)', () => {
        it('should reject javascript: protocol', () => {
            expect(isSafeUrl('javascript:alert(1)')).toBe(false);
            expect(isSafeUrl('javascript:void(0)')).toBe(false);
            expect(isSafeUrl('javascript:document.cookie')).toBe(false);
        });

        it('should reject data: protocol', () => {
            expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
            expect(isSafeUrl('data:application/pdf;base64,ABC')).toBe(false);
        });

        it('should reject vbscript: protocol', () => {
            expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
        });

        it('should reject file: protocol', () => {
            expect(isSafeUrl('file:///etc/passwd')).toBe(false);
            expect(isSafeUrl('file://C:/Windows/System32')).toBe(false);
        });

        it('should reject ftp: protocol', () => {
            expect(isSafeUrl('ftp://example.com/file')).toBe(false);
        });
    });

    describe('invalid URLs (should return false)', () => {
        it('should reject empty string', () => {
            expect(isSafeUrl('')).toBe(false);
        });

        it('should reject malformed URLs', () => {
            expect(isSafeUrl('not a url')).toBe(false);
            expect(isSafeUrl('://missing-protocol')).toBe(false);
            expect(isSafeUrl('http://')).toBe(false);
        });

        it('should reject relative URLs', () => {
            expect(isSafeUrl('/path/to/page')).toBe(false);
            expect(isSafeUrl('./relative')).toBe(false);
            expect(isSafeUrl('../parent')).toBe(false);
        });

        it('should reject protocol-relative URLs', () => {
            expect(isSafeUrl('//example.com')).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should handle URLs with special characters', () => {
            expect(isSafeUrl('https://example.com/path?q=hello%20world')).toBe(true);
            expect(isSafeUrl('https://example.com/path#section')).toBe(true);
        });

        it('should handle URLs with authentication', () => {
            expect(isSafeUrl('https://user:pass@example.com')).toBe(true);
        });

        it('should handle internationalized domain names', () => {
            expect(isSafeUrl('https://xn--nxasmq5b.com')).toBe(true);
        });

        it('should be case insensitive for protocol', () => {
            expect(isSafeUrl('HTTPS://example.com')).toBe(true);
            expect(isSafeUrl('HTTP://example.com')).toBe(true);
            expect(isSafeUrl('Https://example.com')).toBe(true);
        });
    });
});
