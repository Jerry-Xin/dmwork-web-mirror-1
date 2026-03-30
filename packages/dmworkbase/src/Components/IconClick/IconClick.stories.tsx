import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import IconClick from './index'

const meta: Meta<typeof IconClick> = {
  title: 'Base/IconClick',
  component: IconClick,
  parameters: {
    docs: {
      description: {
        component: '可点击图标按钮。hover 有背景色，支持 disabled、键盘操作。',
      },
    },
  },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md'] },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof IconClick>

export const Default: Story = {
  name: '默认',
  args: {
    icon: <span style={{ fontSize: 18 }}>✕</span>,
    size: 'md',
  },
}

export const Sizes: Story = {
  name: '尺寸对比',
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <IconClick icon={<span style={{ fontSize: 16 }}>✕</span>} size="sm" title="小号" />
      <IconClick icon={<span style={{ fontSize: 18 }}>✕</span>} size="md" title="中号" />
    </div>
  ),
}

export const Disabled: Story = {
  name: '禁用',
  args: {
    icon: <span style={{ fontSize: 18 }}>✕</span>,
    disabled: true,
  },
}

export const Common: Story = {
  name: '常见用法',
  render: () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <IconClick icon={<span style={{ fontSize: 18 }}>✕</span>} title="关闭" onClick={() => alert('关闭')} />
      <IconClick icon={<span style={{ fontSize: 18 }}>⋯</span>} title="更多" onClick={() => alert('更多')} />
      <IconClick icon={<span style={{ fontSize: 18 }}>🔍</span>} title="搜索" onClick={() => alert('搜索')} />
      <IconClick icon={<span style={{ fontSize: 18 }}>✏️</span>} title="编辑" onClick={() => alert('编辑')} />
    </div>
  ),
}
