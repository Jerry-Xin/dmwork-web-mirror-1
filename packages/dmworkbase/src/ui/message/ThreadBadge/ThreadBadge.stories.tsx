import type { Meta, StoryObj } from '@storybook/react'
import ThreadBadge from './index'

const meta: Meta<typeof ThreadBadge> = {
  title: 'ui/message/ThreadBadge',
  component: ThreadBadge,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ThreadBadge>

const mockParticipants = [
  { uid: '1', avatarUrl: 'https://i.pravatar.cc/16?img=1' },
  { uid: '2', avatarUrl: 'https://i.pravatar.cc/16?img=2' },
  { uid: '3', avatarUrl: 'https://i.pravatar.cc/16?img=3' },
  { uid: '4', avatarUrl: 'https://i.pravatar.cc/16?img=4' },
]

const manyParticipants = [
  ...mockParticipants,
  { uid: '5', avatarUrl: 'https://i.pravatar.cc/16?img=5' },
  { uid: '6', avatarUrl: 'https://i.pravatar.cc/16?img=6' },
]

/**
 * 默认样式（12条回复）
 */
export const Default: Story = {
  args: {
    replyCount: 12,
    participants: mockParticipants,
    lastReplyTime: '5分钟前回复',
    onClick: () => alert('点击查看 Thread'),
  },
}

/**
 * 少量回复（3条）
 */
export const FewReplies: Story = {
  args: {
    replyCount: 3,
    participants: mockParticipants.slice(0, 2),
    lastReplyTime: '刚刚回复',
  },
}

/**
 * 大量回复（33条）
 */
export const ManyReplies: Story = {
  args: {
    replyCount: 33,
    participants: mockParticipants,
    lastReplyTime: '1小时前回复',
  },
}

/**
 * 超过4个参与者（显示 +N）
 */
export const MoreThan4Participants: Story = {
  args: {
    replyCount: 20,
    participants: manyParticipants,
    lastReplyTime: '沙东惠等6人·5分钟前回复',
  },
}

/**
 * 单个参与者
 */
export const SingleParticipant: Story = {
  args: {
    replyCount: 1,
    participants: [mockParticipants[0]],
    lastReplyTime: '刚刚回复',
  },
}

/**
 * 完整场景（参考设计稿 318-6276）
 */
export const DesignReference: Story = {
  args: {
    replyCount: 12,
    participants: mockParticipants,
    lastReplyTime: '沙东惠等6人·5分钟前回复',
  },
}

/**
 * Hover 态演示
 */
export const HoverDemo: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#666' }}>
          Hover 时回复数文字显示下划线
        </p>
        <ThreadBadge
          replyCount={12}
          participants={mockParticipants}
          lastReplyTime="5分钟前回复"
        />
      </div>
    </div>
  ),
}
