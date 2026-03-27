import type { Meta, StoryObj } from '@storybook/react-vite'
import React, { useState } from 'react'
import Search from './index'

const meta: Meta<typeof Search> = {
  title: 'Base/Search',
  component: Search,
  parameters: {
    docs: {
      description: {
        component: `
搜索输入框，基于 Semi Design Input 封装。

**注意：**
- 非受控组件，外部只能监听 \`onChange\`，不能传 \`value\` 控制输入值
- \`onEnterPress\` 用于触发搜索
        `,
      },
    },
  },
  argTypes: {
    placeholder: { control: 'text', description: '占位文字' },
  },
}

export default meta
type Story = StoryObj<typeof Search>

export const Default: Story = {
  name: '默认',
  args: { placeholder: '搜索...' },
}

export const WithCallback: Story = {
  name: '带回调（实时显示输入值）',
  render: () => {
    const [value, setValue] = useState('')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Search
          placeholder="输入内容..."
          onChange={setValue}
          onEnterPress={() => alert(`搜索：${value}`)}
        />
        <div style={{ fontSize: 13, color: 'var(--wk-text-secondary)' }}>
          当前值：<code style={{ color: 'var(--wk-text-accent)' }}>{value || '（空）'}</code>
        </div>
      </div>
    )
  },
}

export const FullWidth: Story = {
  name: '全宽',
  render: () => (
    <div style={{ width: '100%' }}>
      <Search placeholder="搜索联系人..." />
    </div>
  ),
}
