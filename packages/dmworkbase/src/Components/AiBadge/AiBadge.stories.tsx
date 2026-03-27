import type { Meta, StoryObj } from '@storybook/react-vite'
import React from 'react'
import AiBadge from './index'

const meta: Meta<typeof AiBadge> = {
  title: 'Base/AiBadge',
  component: AiBadge,
  parameters: {
    docs: {
      description: {
        component: `
AI 角标，用于头像右下角标注 Bot 身份。

**使用规范：**
- 必须配合 \`position: relative\` 的父容器使用
- 父容器**禁止** \`overflow: hidden\`，否则角标会被裁剪
- 只有两个合法 size：\`default\` 和 \`small\`
        `,
      },
    },
  },
  argTypes: {
    size: {
      control: 'radio',
      options: ['default', 'small'],
      description: '角标尺寸',
    },
    className: {
      control: 'text',
      description: '附加 class（加到根元素）',
    },
  },
}

export default meta
type Story = StoryObj<typeof AiBadge>

// ── 基础用法 ──
export const Default: Story = {
  name: '默认尺寸',
  args: { size: 'default' },
}

export const Small: Story = {
  name: '小尺寸',
  args: { size: 'small' },
}

// ── 配合头像使用 ──
export const WithAvatar: Story = {
  name: '配合头像（正确用法）',
  parameters: {
    docs: {
      description: {
        story: '父容器必须 `position: relative`，禁止 `overflow: hidden`。角标用独立 wrapper 做绝对定位，不传 style 给 AiBadge。',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end' }}>
      {/* default size + 大头像 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 6,
            background: 'var(--wk-bg-elevated)',
            border: '1px solid var(--wk-border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🤖</div>
          {/* 角标 wrapper 做定位，不给 AiBadge 传 style */}
          <span style={{ position: 'absolute', bottom: -4, right: -4 }}>
            <AiBadge size="default" />
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--wk-text-secondary)' }}>default (40px 头像)</span>
      </div>

      {/* small size + 小头像 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--wk-bg-elevated)',
            border: '1px solid var(--wk-border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>🤖</div>
          <span style={{ position: 'absolute', bottom: -3, right: -3 }}>
            <AiBadge size="small" />
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--wk-text-secondary)' }}>small (28px 头像)</span>
      </div>
    </div>
  ),
}

// ── 错误用法演示 ──
export const WrongUsage: Story = {
  name: '❌ 错误用法（overflow: hidden）',
  parameters: {
    docs: {
      description: {
        story: '父容器加了 `overflow: hidden` 会裁掉角标，禁止这样用',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end' }}>
      {/* 错误：overflow hidden */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', display: 'inline-block', overflow: 'hidden' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 6,
            background: 'var(--wk-bg-elevated)',
            border: '1px solid var(--wk-border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🤖</div>
          <span style={{ position: 'absolute', bottom: -4, right: -4 }}>
            <AiBadge size="default" />
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--wk-color-error)' }}>❌ overflow: hidden（角标被裁）</span>
      </div>

      {/* 正确：无 overflow */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 6,
            background: 'var(--wk-bg-elevated)',
            border: '1px solid var(--wk-border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🤖</div>
          <span style={{ position: 'absolute', bottom: -4, right: -4 }}>
            <AiBadge size="default" />
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--wk-color-success)' }}>✅ 无 overflow（正确）</span>
      </div>
    </div>
  ),
}

// ── 两种尺寸对比 ──
export const SizeComparison: Story = {
  name: '尺寸对比',
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <AiBadge size="default" />
        <span style={{ fontSize: 12, color: 'var(--wk-text-secondary)' }}>default</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <AiBadge size="small" />
        <span style={{ fontSize: 12, color: 'var(--wk-text-secondary)' }}>small</span>
      </div>
    </div>
  ),
}
