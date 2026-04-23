import type { Meta, StoryObj } from '@storybook/react'
import Bubble from './index'

const meta: Meta<typeof Bubble> = {
  title: 'ui/message/Bubble',
  component: Bubble,
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['single', 'first', 'middle', 'last'],
    },
    isSend: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof Bubble>

const sampleText = '这是一条测试消息，用于展示气泡样式。'
const longText = '这是一条很长的测试消息，用于展示换行效果。当消息内容超过气泡宽度时，会自动换行显示，保持良好的阅读体验。'

/**
 * 单条消息（全圆角）- 发送方
 */
export const SingleSend: Story = {
  args: {
    position: 'single',
    isSend: true,
    children: sampleText,
  },
}

/**
 * 单条消息（全圆角）- 接收方
 */
export const SingleRecv: Story = {
  args: {
    position: 'single',
    isSend: false,
    children: sampleText,
  },
}

/**
 * 连续消息 - 第一条（发送方）
 */
export const FirstSend: Story = {
  args: {
    position: 'first',
    isSend: true,
    children: sampleText,
  },
}

/**
 * 连续消息 - 第一条（接收方）
 */
export const FirstRecv: Story = {
  args: {
    position: 'first',
    isSend: false,
    children: sampleText,
  },
}

/**
 * 连续消息 - 中间（发送方）
 */
export const MiddleSend: Story = {
  args: {
    position: 'middle',
    isSend: true,
    children: sampleText,
  },
}

/**
 * 连续消息 - 中间（接收方）
 */
export const MiddleRecv: Story = {
  args: {
    position: 'middle',
    isSend: false,
    children: sampleText,
  },
}

/**
 * 连续消息 - 最后一条（发送方）
 */
export const LastSend: Story = {
  args: {
    position: 'last',
    isSend: true,
    children: sampleText,
  },
}

/**
 * 连续消息 - 最后一条（接收方）
 */
export const LastRecv: Story = {
  args: {
    position: 'last',
    isSend: false,
    children: sampleText,
  },
}

/**
 * 长文本换行
 */
export const LongText: Story = {
  args: {
    position: 'single',
    isSend: false,
    children: longText,
  },
}

/**
 * 自定义样式（透明背景，用于大表情）
 */
export const CustomStyle: Story = {
  args: {
    position: 'single',
    isSend: false,
    style: {
      background: 'transparent',
      boxShadow: 'none',
      padding: 0,
    },
    children: (
      <div style={{ fontSize: '80px', lineHeight: 1 }}>
        😊
      </div>
    ),
  },
}

/**
 * 4 种位置对比（发送方）
 */
export const PositionComparisonSend: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', maxWidth: '300px', marginLeft: 'auto' }}>
      <Bubble position="single" isSend>Single (全圆角)</Bubble>
      <Bubble position="first" isSend>First (上圆下直)</Bubble>
      <Bubble position="middle" isSend>Middle (全直)</Bubble>
      <Bubble position="last" isSend>Last (上直下圆)</Bubble>
    </div>
  ),
}

/**
 * 4 种位置对比（接收方）
 */
export const PositionComparisonRecv: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '300px' }}>
      <Bubble position="single" isSend={false}>Single (全圆角)</Bubble>
      <Bubble position="first" isSend={false}>First (上圆下直)</Bubble>
      <Bubble position="middle" isSend={false}>Middle (全直)</Bubble>
      <Bubble position="last" isSend={false}>Last (上直下圆)</Bubble>
    </div>
  ),
}
