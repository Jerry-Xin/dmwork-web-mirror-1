/**
 * URL protocol validation to prevent XSS attacks
 * Only allows http: and https: protocols
 */
export function isSafeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}
