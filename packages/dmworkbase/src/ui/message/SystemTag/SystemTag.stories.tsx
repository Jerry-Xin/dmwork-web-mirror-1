import type { Meta, StoryObj } from '@storybook/react'
import SystemTag from './index'

const meta: Meta<typeof SystemTag> = {
  title: 'ui/message/SystemTag',
  component: SystemTag,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof SystemTag>

/**
 * 时间分割线
 */
export const Today: Story = {
  args: {
    text: '今天',
  },
}

/**
 * 入群通知（含头像）
 */
export const JoinGroup: Story = {
  args: {
    text: '张兴朝邀请牛爷爷进入群聊',
    avatarUrl: 'https://i.pravatar.cc/20?img=10',
  },
}

/**
 * 撤回通知（可关闭）
 */
export const Revoke: Story = {
  args: {
    text: '布鲁托撤回了一条消息',
    onClose: () => alert('关闭通知'),
  },
}

/**
 * 撤回通知（含头像 + 可关闭）
 */
export const RevokeWithAvatar: Story = {
  args: {
    text: '产品经理最严厉的母亲撤回了一条消息',
    avatarUrl: 'https://i.pravatar.cc/20?img=11',
    onClose: () => alert('关闭通知'),
  },
}

/**
 * 截屏通知
 */
export const Screenshot: Story = {
  args: {
    text: '高飞在聊天中截屏了',
    avatarUrl: 'https://i.pravatar.cc/20?img=12',
  },
}

/**
 * 自己撤回
 */
export const RevokeSelf: Story = {
  args: {
    text: '你撤回了一条消息',
  },
}

/**
 * 多种通知对比
 */
export const Comparison: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      <SystemTag text="今天" />
      <SystemTag text="张兴朝邀请牛爷爷进入群聊" avatarUrl="https://i.pravatar.cc/20?img=13" />
      <SystemTag text="布鲁托撤回了一条消息" onClose={() => {}} />
      <SystemTag text="高飞在聊天中截屏了" avatarUrl="https://i.pravatar.cc/20?img=14" />
      <SystemTag 
        text="产品经理最严厉的母亲撤回了一条消息" 
        avatarUrl="https://i.pravatar.cc/20?img=15"
        onClose={() => {}} 
      />
    </div>
  ),
}
