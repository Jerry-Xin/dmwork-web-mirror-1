import type { Meta, StoryObj } from '@storybook/react'
import MergeforwardCard from './index'

const meta: Meta<typeof MergeforwardCard> = {
  title: 'UI/Message/MergeforwardCard',
  component: MergeforwardCard,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof MergeforwardCard>

export const Default: Story = {
  args: {
    title: 'Thomas AI、AoLi 的聊天记录',
    previewMsgs: [
      { fromUID: 'uid1', digest: 'Thomas AI：今天开会的结论是什么？' },
      { fromUID: 'uid2', digest: 'AoLi：需要先对齐一下需求' },
      { fromUID: 'uid1', digest: 'Thomas AI：好的，明天上午十点' },
      { fromUID: 'uid2', digest: 'AoLi：没问题' },
    ],
    onClick: () => alert('点击打开聊天记录'),
  },
}

export const GroupChat: Story = {
  args: {
    title: '群的聊天记录',
    previewMsgs: [
      { fromUID: 'uid1', digest: '小明：大家下午好' },
      { fromUID: 'uid2', digest: '小红：[图片]' },
      { fromUID: 'uid3', digest: '小刚：[文件]' },
    ],
    onClick: () => alert('点击打开聊天记录'),
  },
}

export const SingleMessage: Story = {
  args: {
    title: '小明的聊天记录',
    previewMsgs: [{ fromUID: 'uid1', digest: '小明：明天见！' }],
    onClick: () => alert('点击打开聊天记录'),
  },
}

export const LongContent: Story = {
  args: {
    title: '超级长名字用户A、超级长名字用户B、超级长名字用户C 的聊天记录',
    previewMsgs: [
      {
        fromUID: 'uid1',
        digest:
          '用户A：这是一条非常非常非常非常非常非常非常长的消息，超出一行应该被截断显示省略号',
      },
      { fromUID: 'uid2', digest: '用户B：好的收到' },
    ],
    onClick: () => alert('点击打开聊天记录'),
  },
}

export const Empty: Story = {
  args: {
    title: '聊天记录',
    previewMsgs: [],
    onClick: () => alert('点击打开聊天记录'),
  },
}
