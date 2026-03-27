import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import WKNavHeader from './index'
import WKButton from '../WKButton'

const meta: Meta<typeof WKNavHeader> = {
  title: 'Base/WKNavHeader',
  component: WKNavHeader,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '导航栏头部，左侧标题 + 右侧插槽。',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof WKNavHeader>

export const Default: Story = {
  name: '默认',
  args: { title: '消息' },
}

export const WithRightView: Story = {
  name: '带右侧操作',
  render: () => (
    <WKNavHeader
      title="联系人"
      rightView={
        <WKButton variant="primary" size="sm">+ 添加</WKButton>
      }
    />
  ),
}

export const WithMultipleActions: Story = {
  name: '多个右侧操作',
  render: () => (
    <WKNavHeader
      title="设置"
      rightView={
        <>
          <WKButton variant="ghost" size="sm">取消</WKButton>
          <WKButton variant="primary" size="sm">保存</WKButton>
        </>
      }
    />
  ),
}

export const LongTitle: Story = {
  name: '长标题截断',
  render: () => (
    <WKNavHeader
      title="这是一个非常非常非常非常长的标题，应该被截断显示"
      rightView={<WKButton variant="ghost" size="sm">完成</WKButton>}
    />
  ),
}
