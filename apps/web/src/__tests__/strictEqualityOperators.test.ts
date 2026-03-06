/**
 * Tests to verify strict equality operators (=== and !==) behavior
 * Related to Issue #51: Replace loose equality operators with strict equality operators
 */

describe('Strict Equality Operators', () => {
    describe('=== operator behavior', () => {
        it('should distinguish between number 0 and string "0"', () => {
            expect(0 === '0').toBe(false);
            // eslint-disable-next-line eqeqeq
            expect(0 == '0').toBe(true); // This is why we use ===
        });

        it('should distinguish between number and string representations', () => {
            expect(1 === '1').toBe(false);
            expect(123 === '123').toBe(false);
        });

        it('should correctly compare same types', () => {
            expect(1 === 1).toBe(true);
            expect('abc' === 'abc').toBe(true);
            expect(true === true).toBe(true);
        });

        it('should treat null and undefined as different', () => {
            expect(null === undefined).toBe(false);
            // eslint-disable-next-line eqeqeq
            expect(null == undefined).toBe(true); // This is why we use ===
        });

        it('should correctly compare with empty string', () => {
            expect('' === 0).toBe(false);
            expect('' === false).toBe(false);
            // eslint-disable-next-line eqeqeq
            expect('' == 0).toBe(true); // This is why we use ===
            // eslint-disable-next-line eqeqeq
            expect('' == false).toBe(true); // This is why we use ===
        });
    });

    describe('!== operator behavior', () => {
        it('should correctly identify different types as not equal', () => {
            expect(0 !== '0').toBe(true);
            expect(1 !== '1').toBe(true);
        });

        it('should correctly identify same values as equal', () => {
            expect(0 !== 0).toBe(false);
            expect('abc' !== 'abc').toBe(false);
        });

        it('should correctly handle indexOf results', () => {
            const str = 'hello world';
            // This is how we use !== -1 to check if substring exists
            expect(str.indexOf('world') !== -1).toBe(true);
            expect(str.indexOf('foo') !== -1).toBe(false);
        });
    });

    describe('Real-world use cases from the codebase', () => {
        it('should correctly check array length', () => {
            const emptyArray: number[] = [];
            const nonEmptyArray = [1, 2, 3];

            expect(emptyArray.length === 0).toBe(true);
            expect(nonEmptyArray.length === 0).toBe(false);
        });

        it('should correctly check string trimmed value', () => {
            const emptyString = '   ';
            const nonEmptyString = '  hello  ';

            expect(emptyString.trim() === '').toBe(true);
            expect(nonEmptyString.trim() === '').toBe(false);
        });

        it('should correctly compare enum-like values', () => {
            enum Status {
                Pending = 0,
                Active = 1,
                Completed = 2,
            }

            const currentStatus = Status.Active;
            expect(currentStatus === Status.Active).toBe(true);
            expect(currentStatus === Status.Pending).toBe(false);
        });

        it('should correctly check for uid matches', () => {
            const uid1 = 'user123';
            const uid2 = 'user123';
            const uid3 = 'user456';

            expect(uid1 === uid2).toBe(true);
            expect(uid1 === uid3).toBe(false);
        });

        it('should correctly check channel types', () => {
            const ChannelTypePerson = 1;
            const ChannelTypeGroup = 2;
            const currentChannelType = 1;

            expect(currentChannelType === ChannelTypePerson).toBe(true);
            expect(currentChannelType === ChannelTypeGroup).toBe(false);
        });
    });
});
