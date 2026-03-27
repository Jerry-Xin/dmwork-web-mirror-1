import type { Meta, StoryObj } from '@storybook/react-vite'
import React, { useState } from 'react'
import Checkbox from './index'

const meta: Meta<typeof Checkbox> = {
  title: 'Base/Checkbox',
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component: `
纯 CSS 实现的勾选框，替代旧版图片 Checkbox。

**变更：**
- 移除 png 图片依赖，改为 SVG + CSS
- 新增 \`disabled\` 状态
- 新增 \`children\` label 支持
- 新增 \`onChange(checked: boolean)\`，旧版 \`onCheck\` 保留兼容
- 支持键盘操作（Space/Enter）和无障碍语义
        `,
      },
    },
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const Default: Story = {
  name: '默认',
  args: { checked: false },
}

export const Checked: Story = {
  name: '已选中',
  args: { checked: true },
}

export const WithLabel: Story = {
  name: '带文字',
  args: { checked: false, children: '同意用户协议' },
}

export const Disabled: Story = {
  name: '禁用状态',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Checkbox disabled checked={false}>未选中（禁用）</Checkbox>
      <Checkbox disabled checked={true}>已选中（禁用）</Checkbox>
    </div>
  ),
}

export const Interactive: Story = {
  name: '交互式',
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <Checkbox checked={checked} onChange={setChecked}>
        {checked ? '✅ 已选中' : '点击选中'}
      </Checkbox>
    )
  },
}

export const Group: Story = {
  name: '多选组',
  render: () => {
    const options = ['前端开发', '后端开发', 'UI 设计', '产品经理']
    const [selected, setSelected] = useState<string[]>([])
    const toggle = (item: string) =>
      setSelected(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map(opt => (
          <Checkbox key={opt} checked={selected.includes(opt)} onChange={() => toggle(opt)}>
            {opt}
          </Checkbox>
        ))}
        <div style={{ fontSize: 12, color: 'var(--wk-text-secondary)', marginTop: 4 }}>
          已选：{selected.join('、') || '（无）'}
        </div>
      </div>
    )
  },
}
