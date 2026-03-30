import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import WKButton from './index'

const meta: Meta<typeof WKButton> = {
  title: 'Base/WKButton',
  component: WKButton,
  parameters: {
    docs: {
      description: {
        component: `
DMWork 标准按钮，替代直接使用 Semi Design Button。

**Variant：**
- \`primary\` — 品牌渐变，主要操作
- \`secondary\` — 次要操作（默认）
- \`ghost\` — 无背景，低优先级操作
- \`danger\` — 危险/破坏性操作

**⚠️ 注意：**
- 禁止直接用 \`@douyinfe/semi-ui\` 的 Button，统一用 WKButton
- loading 时自动 disabled，不用手动传 disabled
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'radio',
      options: ['md', 'sm'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    iconOnly: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof WKButton>

// ── 交互式 ──
export const Playground: Story = {
  name: '交互式',
  args: {
    variant: 'primary',
    size: 'md',
    children: '确认',
  },
}

// ── 四种 Variant ──
export const Variants: Story = {
  name: '所有 Variant',
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <WKButton variant="primary">Primary</WKButton>
      <WKButton variant="secondary">Secondary</WKButton>
      <WKButton variant="ghost">Ghost</WKButton>
      <WKButton variant="danger">Danger</WKButton>
    </div>
  ),
}

// ── 两种尺寸 ──
export const Sizes: Story = {
  name: '尺寸对比',
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <WKButton variant="primary" size="md">中号 (md)</WKButton>
      <WKButton variant="primary" size="sm">小号 (sm)</WKButton>
      <WKButton variant="secondary" size="md">中号 (md)</WKButton>
      <WKButton variant="secondary" size="sm">小号 (sm)</WKButton>
    </div>
  ),
}

// ── 状态 ──
export const States: Story = {
  name: '状态（disabled / loading）',
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <WKButton variant="primary" disabled>Disabled</WKButton>
      <WKButton variant="secondary" disabled>Disabled</WKButton>
      <WKButton variant="primary" loading>Loading</WKButton>
      <WKButton variant="secondary" loading>Loading</WKButton>
    </div>
  ),
}

// ── 带图标 ──
export const WithIcon: Story = {
  name: '带图标',
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <WKButton variant="primary" icon={<span>✨</span>}>新建任务</WKButton>
      <WKButton variant="secondary" icon={<span>📎</span>}>附件</WKButton>
      <WKButton variant="ghost" icon={<span>🔍</span>}>搜索</WKButton>
    </div>
  ),
}

// ── Icon Only ──
export const IconOnly: Story = {
  name: 'Icon Only',
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <WKButton variant="ghost" iconOnly icon={<span>✕</span>} aria-label="关闭" size="md" />
      <WKButton variant="ghost" iconOnly icon={<span>✕</span>} aria-label="关闭" size="sm" />
      <WKButton variant="secondary" iconOnly icon={<span>⋯</span>} aria-label="更多" size="md" />
    </div>
  ),
}

// ── 全量对比 ──
export const AllCombinations: Story = {
  name: '全量对比',
  render: () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger'] as const
    const sizes = ['md', 'sm'] as const
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sizes.map(size => (
          <div key={size}>
            <div style={{ fontSize: 12, color: 'var(--wk-text-tertiary)', marginBottom: 8, fontFamily: 'monospace' }}>size="{size}"</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {variants.map(variant => (
                <WKButton key={variant} variant={variant} size={size}>
                  {variant}
                </WKButton>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  },
}
