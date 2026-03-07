import { evaluatePasswordStrength, validatePassword } from '@dmwork/login/src/passwordStrength';

describe('evaluatePasswordStrength', () => {
    describe('empty password', () => {
        it('should return invalid result for empty password', () => {
            const result = evaluatePasswordStrength('');
            expect(result.isValid).toBe(false);
            expect(result.score).toBe(0);
            expect(result.label).toBe('');
        });
    });

    describe('short passwords', () => {
        it('should mark password shorter than 8 characters as invalid', () => {
            const result = evaluatePasswordStrength('abc123');
            expect(result.isValid).toBe(false);
            expect(result.feedback).toContain('密码长度至少需要 8 位');
        });

        it('should mark 7-character password as invalid', () => {
            const result = evaluatePasswordStrength('Aa1bcde');
            expect(result.isValid).toBe(false);
        });
    });

    describe('weak passwords', () => {
        it('should detect common passwords as weak', () => {
            const result = evaluatePasswordStrength('password');
            expect(result.score).toBeLessThanOrEqual(1);
            expect(result.label).toMatch(/非常弱|弱/);
        });

        it('should detect "12345678" as weak', () => {
            const result = evaluatePasswordStrength('12345678');
            expect(result.score).toBeLessThanOrEqual(1);
            expect(result.isValid).toBe(false);
        });

        it('should detect "qwerty123" as weak', () => {
            const result = evaluatePasswordStrength('qwerty123');
            expect(result.score).toBeLessThanOrEqual(1);
        });
    });

    describe('fair passwords', () => {
        it('should rate uncommon mixed-case alphanumeric as fair or better', () => {
            // Use a less common pattern that zxcvbn won't recognize
            const result = evaluatePasswordStrength('Kx7mQ2pL9w');
            expect(result.score).toBeGreaterThanOrEqual(2);
        });

        it('should correctly identify common password patterns as weak', () => {
            // zxcvbn correctly identifies "MyP4ssw0rd" as a common pattern
            const result = evaluatePasswordStrength('MyP4ssw0rd');
            expect(result.score).toBeLessThanOrEqual(1);
            expect(result.isValid).toBe(false);
        });
    });

    describe('strong passwords', () => {
        it('should rate complex password with symbols as strong', () => {
            const result = evaluatePasswordStrength('C0mpl3x!P@ssw0rd#2024');
            expect(result.score).toBeGreaterThanOrEqual(3);
            expect(result.isValid).toBe(true);
        });

        it('should rate long random password as very strong', () => {
            const result = evaluatePasswordStrength('Xk9$mP2q#Lw5@nR8');
            expect(result.score).toBeGreaterThanOrEqual(3);
            expect(result.isValid).toBe(true);
        });

        it('should rate passphrase-style password as strong', () => {
            const result = evaluatePasswordStrength('correct horse battery staple');
            expect(result.score).toBeGreaterThanOrEqual(3);
            expect(result.isValid).toBe(true);
        });
    });

    describe('score labels', () => {
        it('should have correct label for each score level', () => {
            // Very weak
            const veryWeak = evaluatePasswordStrength('a');
            expect(veryWeak.label).toBe('非常弱');

            // Strong passwords
            const strong = evaluatePasswordStrength('Xk9$mP2q#Lw5@nR8!very');
            expect(['强', '非常强']).toContain(strong.label);
        });
    });

    describe('color codes', () => {
        it('should return appropriate colors for different strength levels', () => {
            const weak = evaluatePasswordStrength('password');
            expect(weak.color).toMatch(/#ff/i); // Red-ish color

            const strong = evaluatePasswordStrength('Xk9$mP2q#Lw5@nR8!abc');
            expect(strong.color).toMatch(/#[0-9a-f]{6}/i);
        });
    });
});

describe('validatePassword', () => {
    describe('empty password', () => {
        it('should return error for empty password', () => {
            expect(validatePassword('')).toBe('密码不能为空');
        });

        it('should return error for undefined-like empty string', () => {
            expect(validatePassword('')).toBe('密码不能为空');
        });
    });

    describe('short password', () => {
        it('should return error for password shorter than 8 characters', () => {
            expect(validatePassword('short')).toBe('密码长度至少需要 8 位');
            expect(validatePassword('1234567')).toBe('密码长度至少需要 8 位');
        });

        it('should accept exactly 8 characters if strong enough', () => {
            // This is a strong 8-char password
            const result = validatePassword('Aa1!bcde');
            // It might still fail if zxcvbn considers it weak, but length check should pass
            expect(result).not.toBe('密码长度至少需要 8 位');
        });
    });

    describe('weak password', () => {
        it('should return error for weak password', () => {
            expect(validatePassword('password')).toBe('密码强度太弱，请设置更安全的密码');
            expect(validatePassword('12345678')).toBe('密码强度太弱，请设置更安全的密码');
        });
    });

    describe('valid password', () => {
        it('should return null for strong password', () => {
            expect(validatePassword('C0mpl3x!P@ssw0rd#2024')).toBeNull();
            expect(validatePassword('Xk9$mP2q#Lw5@nR8')).toBeNull();
        });

        it('should return null for passphrase-style password', () => {
            expect(validatePassword('correct horse battery staple')).toBeNull();
        });
    });
});
