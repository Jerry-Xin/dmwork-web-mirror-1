import type { Meta, StoryObj } from '@storybook/react'
import ThreadParent from './index'

const meta: Meta<typeof ThreadParent> = {
  title: 'ui/message/ThreadParent',
  component: ThreadParent,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ThreadParent>

const mockParticipants = [
  { uid: '1', avatarUrl: 'https://i.pravatar.cc/16?img=30' },
  { uid: '2', avatarUrl: 'https://i.pravatar.cc/16?img=31' },
  { uid: '3', avatarUrl: 'https://i.pravatar.cc/16?img=32' },
  { uid: '4', avatarUrl: 'https://i.pravatar.cc/16?img=33' },
]

/**
 * 默认样式（参考 Figma 318:6276）
 */
export const Default: Story = {
  args: {
    replyCount: 12,
    participants: mockParticipants,
    lastReplyTime: '沙东惠等6人·5分钟前回复',
    onThreadClick: () => alert('打开 Thread'),
    children: (
      <div>
        📌大家早昨天提的新需求我整理了一下，主要有三点：用户分组、Thread 功能、消息搜索优化。
      </div>
    ),
  },
}

/**
 * 少量回复
 */
export const FewReplies: Story = {
  args: {
    replyCount: 3,
    participants: mockParticipants.slice(0, 2),
    lastReplyTime: '刚刚回复',
    children: '这个需求我觉得可以优先做',
  },
}

/**
 * 大量回复
 */
export const ManyReplies: Story = {
  args: {
    replyCount: 33,
    participants: mockParticipants,
    lastReplyTime: '沙东惠等6人·5分钟前回复',
    children: (
      <div>
        📌数据库到底用 MySQL？ 还是 PostgreSQL？需要综合考虑一下性能、JSONB 支持、运维成本这几个维度，大家讨论一下。
      </div>
    ),
  },
}

/**
 * 完整场景（对比 Figma 318:6276）
 */
export const DesignReference: Story = {
  render: () => (
    <div style={{ maxWidth: '600px' }}>
      <ThreadParent
        replyCount={12}
        participants={mockParticipants}
        lastReplyTime="沙东惠等6人·5分钟前回复"
        onThreadClick={() => alert('打开 Thread')}
      >
        📌大家早昨天提的新需求我整理了一下，主要有三点：用户分组、Thread 功能、消息搜索优化。
      </ThreadParent>
    </div>
  ),
}
