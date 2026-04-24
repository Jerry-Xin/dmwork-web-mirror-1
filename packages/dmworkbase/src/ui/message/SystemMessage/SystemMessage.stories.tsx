import type { Meta, StoryObj } from '@storybook/react'
import SystemMessage from './index'

const meta: Meta<typeof SystemMessage> = {
  title: 'ui/message/SystemMessage',
  component: SystemMessage,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SystemMessage>

/**
 * 入群通知
 */
export const Join: Story = {
  args: {
    type: 'join',
    text: '李磊 加入了群组',
    avatarUrl: 'https://i.pravatar.cc/20?img=40',
  },
}

/**
 * 离群通知
 */
export const Leave: Story = {
  args: {
    type: 'leave',
    text: '张三 离开了群组',
  },
}

/**
 * 撤回消息
 */
export const Revoke: Story = {
  args: {
    type: 'revoke',
    text: '你撤回了一条消息',
    closable: true,
    onClose: () => alert('关闭'),
  },
}

/**
 * 截屏提醒
 */
export const Screenshot: Story = {
  args: {
    type: 'screenshot',
    text: '对方已截屏',
    closable: true,
    onClose: () => alert('关闭'),
  },
}

/**
 * 多条系统消息
 */
export const Multiple: Story = {
  render: () => (
    <div>
      <SystemMessage
        type="join"
        text="李磊 加入了群组"
        avatarUrl="https://i.pravatar.cc/20?img=40"
      />
      <SystemMessage
        type="revoke"
        text="你撤回了一条消息"
        closable
        onClose={() => alert('关闭')}
      />
      <SystemMessage
        type="screenshot"
        text="对方已截屏"
        closable
        onClose={() => alert('关闭')}
      />
    </div>
  ),
}
