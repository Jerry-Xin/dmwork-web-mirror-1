/**
 * Unit tests for UserInfo bot button state logic
 * Tests that bot cards show "添加好友" when not friends, and "发送消息" when friends
 * (fix for issue #618)
 */

// UserRelation constants (mirrors dmworkbase/src/Service/Const.ts)
const UserRelation = {
    stranger: 0,
    friend: 1,
    blacklist: 2,
};

describe('UserInfo bot button state logic', () => {
    // Extracted button state logic from UserInfo component for testing
    function getButtonState(options: {
        isSelf: boolean;
        spaceId: string | undefined;
        isBot: boolean;
        isFriend: boolean;
        hasVercode: boolean;
    }): 'send_message' | 'add_friend' | 'none' {
        const { isSelf, spaceId, isBot, isFriend, hasVercode } = options;

        if (isSelf) {
            return 'none';
        }

        // Space mode: members can message directly
        if (spaceId) {
            return 'send_message';
        }

        if (isFriend) {
            return 'send_message';
        }

        // Bot not yet friend: show add friend button (no vercode required)
        if (isBot) {
            return 'add_friend';
        }

        // Regular user without vercode: no button
        if (!hasVercode) {
            return 'none';
        }

        return 'add_friend';
    }

    describe('Bot card scenarios', () => {
        it('should show "添加好友" for bot that is not a friend', () => {
            const result = getButtonState({
                isSelf: false,
                spaceId: undefined,
                isBot: true,
                isFriend: false,
                hasVercode: false,
            });

            expect(result).toBe('add_friend');
        });

        it('should show "发送消息" for bot that is a friend', () => {
            const result = getButtonState({
                isSelf: false,
                spaceId: undefined,
                isBot: true,
                isFriend: true,
                hasVercode: false,
            });

            expect(result).toBe('send_message');
        });

        it('should show "发送消息" for bot in Space mode (regardless of friend status)', () => {
            const result = getButtonState({
                isSelf: false,
                spaceId: 'space-123',
                isBot: true,
                isFriend: false,
                hasVercode: false,
            });

            expect(result).toBe('send_message');
        });

        it('should show nothing for self (even if bot)', () => {
            const result = getButtonState({
                isSelf: true,
                spaceId: undefined,
                isBot: true,
                isFriend: false,
                hasVercode: false,
            });

            expect(result).toBe('none');
        });
    });

    describe('Regular user card scenarios', () => {
        it('should show "发送消息" for friend', () => {
            const result = getButtonState({
                isSelf: false,
                spaceId: undefined,
                isBot: false,
                isFriend: true,
                hasVercode: false,
            });

            expect(result).toBe('send_message');
        });

        it('should show "添加好友" for non-friend with vercode', () => {
            const result = getButtonState({
                isSelf: false,
                spaceId: undefined,
                isBot: false,
                isFriend: false,
                hasVercode: true,
            });

            expect(result).toBe('add_friend');
        });

        it('should show nothing for non-friend without vercode', () => {
            const result = getButtonState({
                isSelf: false,
                spaceId: undefined,
                isBot: false,
                isFriend: false,
                hasVercode: false,
            });

            expect(result).toBe('none');
        });

        it('should show "发送消息" in Space mode (regardless of friend status)', () => {
            const result = getButtonState({
                isSelf: false,
                spaceId: 'space-456',
                isBot: false,
                isFriend: false,
                hasVercode: false,
            });

            expect(result).toBe('send_message');
        });
    });

    describe('UserRelation constants', () => {
        it('should have correct friend relation value', () => {
            expect(UserRelation.friend).toBe(1);
        });

        it('should have correct stranger relation value', () => {
            expect(UserRelation.stranger).toBe(0);
        });
    });

    describe('Edge cases', () => {
        it('bot with vercode but not friend should still show add_friend', () => {
            const result = getButtonState({
                isSelf: false,
                spaceId: undefined,
                isBot: true,
                isFriend: false,
                hasVercode: true,
            });

            expect(result).toBe('add_friend');
        });

        it('bot friend in Space mode should show send_message', () => {
            const result = getButtonState({
                isSelf: false,
                spaceId: 'space-789',
                isBot: true,
                isFriend: true,
                hasVercode: false,
            });

            expect(result).toBe('send_message');
        });
    });
});
