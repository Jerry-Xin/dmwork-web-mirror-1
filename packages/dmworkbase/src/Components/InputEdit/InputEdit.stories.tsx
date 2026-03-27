import type { Meta, StoryObj } from '@storybook/react-vite'
import React, { useState } from 'react'
import InputEdit from './index'

const meta: Meta<typeof InputEdit> = {
  title: 'Base/InputEdit',
  component: InputEdit,
  parameters: {
    docs: {
      description: {
        component: `
多行文本输入，基于 Semi TextArea 封装。

**特点：**
- 自动高度（minRows=2, maxRows=6）
- 支持字数限制 + 超出提示
- 默认 Enter 不换行（表单场景），\`allowWrap\` 开启换行
        `,
      },
    },
  },
  argTypes: {
    maxCount: { control: 'number' },
    allowWrap: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof InputEdit>

export const Default: Story = {
  name: '默认',
  args: { placeholder: '请输入内容...' },
}

export const WithMaxCount: Story = {
  name: '字数限制',
  args: {
    placeholder: '最多输入 100 字...',
    maxCount: 100,
  },
}

export const WithDefaultValue: Story = {
  name: '有默认值',
  args: {
    defaultValue: '这是默认内容',
    maxCount: 50,
  },
}

export const WithCallback: Story = {
  name: '带回调',
  render: () => {
    const [value, setValue] = useState('')
    const [exceeded, setExceeded] = useState(false)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <InputEdit
          placeholder="输入内容..."
          maxCount={30}
          onChange={(v, e) => { setValue(v); setExceeded(!!e) }}
        />
        <div style={{ fontSize: 12, color: exceeded ? 'var(--wk-color-error)' : 'var(--wk-text-secondary)' }}>
          {exceeded ? '⚠️ 超出限制' : `字数：${value.length}`}
        </div>
      </div>
    )
  },
}

export const AllowWrap: Story = {
  name: '允许换行',
  args: {
    placeholder: 'Shift+Enter 或直接 Enter 换行...',
    allowWrap: true,
  },
}
