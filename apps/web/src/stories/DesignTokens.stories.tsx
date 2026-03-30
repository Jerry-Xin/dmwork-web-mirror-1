import type { Meta, StoryObj } from '@storybook/react-vite'
import React, { useEffect, useState } from 'react'

// ── 工具函数：读取 CSS 变量实际值 ──
function getCSSVar(name: string): string {
  return getComputedStyle(document.body).getPropertyValue(name).trim()
}

// ── 监听主题变化的 hook ──
function useCSSVar(name: string): string {
  const [value, setValue] = useState(() => getCSSVar(name))

  useEffect(() => {
    // 初始读一次
    setValue(getCSSVar(name))

    // 监听 body attribute 变化（theme-mode 切换）
    const observer = new MutationObserver(() => {
      setValue(getCSSVar(name))
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['theme-mode'] })
    return () => observer.disconnect()
  }, [name])

  return value
}

// ── 色板组件 ──
function ColorSwatch({ name, desc }: { name: string; desc?: string }) {
  const value = useCSSVar(name)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 8, flexShrink: 0,
        background: `var(${name})`,
        border: '1px solid rgba(128,128,128,0.2)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }} />
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>{value || '—'}</div>
        {desc && <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>{desc}</div>}
      </div>
    </div>
  )
}

// ── 间距展示 ──
function SpacingSwatch({ name, px }: { name: string; px: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{
        height: 20, width: `var(${name})`,
        background: 'var(--wk-brand-primary)',
        borderRadius: 2, flexShrink: 0, minWidth: 4,
      }} />
      <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{name} <span style={{ opacity: 0.5 }}>= {px}</span></div>
    </div>
  )
}

// ── 圆角展示 ──
function RadiusSwatch({ name, px }: { name: string; px: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div style={{
        width: 64, height: 32, flexShrink: 0,
        background: 'var(--wk-brand-gradient)',
        borderRadius: `var(${name})`,
      }} />
      <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{name} <span style={{ opacity: 0.5 }}>= {px}</span></div>
    </div>
  )
}

// ── 阴影展示 ──
function ShadowSwatch({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
      <div style={{
        width: 80, height: 48, borderRadius: 8, flexShrink: 0,
        background: 'var(--wk-bg-surface)',
        boxShadow: `var(${name})`,
      }} />
      <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{name}</div>
    </div>
  )
}

// ── 排版展示 ──
function TypographySwatch({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, opacity: 0.45, fontFamily: 'monospace', marginBottom: 4 }}>{label}</div>
      <div style={style}>AaBbCcDd — 对话即工作台</div>
    </div>
  )
}

// ── Section wrapper ──
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, paddingBottom: 8, borderBottom: '1px solid var(--wk-border-default)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  )
}

// ── 主展示组件 ──
function DesignTokensPage() {
  return (
    <div style={{
      padding: 40,
      background: 'var(--wk-bg-base)',
      color: 'var(--wk-text-primary)',
      minHeight: '100vh',
      fontFamily: 'var(--wk-font-sans)',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>DMWork Design Tokens</h1>
        <p style={{ color: 'var(--wk-text-secondary)', marginBottom: 48, fontSize: 14 }}>
          切换右上角 Theme 查看亮/暗色效果 · 所有值实时从 CSS 变量读取
        </p>

        <Section title="🎨 品牌色">
          <ColorSwatch name="--wk-brand-primary" desc="主品牌色（紫）" />
          <ColorSwatch name="--wk-brand-primary-hover" desc="hover 态" />
          <ColorSwatch name="--wk-brand-secondary" desc="辅助品牌色（青）" />
          <ColorSwatch name="--wk-brand-glow" desc="发光效果" />
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, opacity: 0.5, fontFamily: 'monospace', marginBottom: 6 }}>--wk-brand-gradient</div>
            <div style={{ height: 32, borderRadius: 8, background: 'var(--wk-brand-gradient)' }} />
          </div>
        </Section>

        <Section title="🌓 语义色">
          <Group title="背景层">
            <ColorSwatch name="--wk-bg-deep" desc="最深背景" />
            <ColorSwatch name="--wk-bg-base" desc="页面底色" />
            <ColorSwatch name="--wk-bg-surface" desc="卡片/面板" />
            <ColorSwatch name="--wk-bg-elevated" desc="浮层/悬浮" />
            <ColorSwatch name="--wk-bg-hover" desc="hover 背景" />
            <ColorSwatch name="--wk-bg-active" desc="active 背景" />
          </Group>
          <Group title="文字">
            <ColorSwatch name="--wk-text-primary" desc="主文字" />
            <ColorSwatch name="--wk-text-secondary" desc="次要文字" />
            <ColorSwatch name="--wk-text-tertiary" desc="辅助文字" />
            <ColorSwatch name="--wk-text-accent" desc="强调文字" />
            <ColorSwatch name="--wk-text-inverse" desc="反色文字" />
          </Group>
          <Group title="边框">
            <ColorSwatch name="--wk-border-subtle" desc="极淡边框" />
            <ColorSwatch name="--wk-border-default" desc="默认边框" />
            <ColorSwatch name="--wk-border-strong" desc="强边框" />
            <ColorSwatch name="--wk-border-glow" desc="品牌发光边框" />
          </Group>
        </Section>

        <Section title="🚦 功能色">
          <ColorSwatch name="--wk-color-success" desc="成功/正向" />
          <ColorSwatch name="--wk-color-warning" desc="警告" />
          <ColorSwatch name="--wk-color-error" desc="错误/危险" />
          <ColorSwatch name="--wk-color-info" desc="信息" />
        </Section>

        <Section title="🤖 AI 专属色">
          <ColorSwatch name="--wk-ai-surface" desc="AI 消息背景" />
          <ColorSwatch name="--wk-ai-border" desc="AI 消息边框" />
          <ColorSwatch name="--wk-ai-glow" desc="AI 区域发光" />
        </Section>

        <Section title="📐 间距（4px 栅格）">
          {[
            ['--wk-sp-1', '4px'],
            ['--wk-sp-2', '8px'],
            ['--wk-sp-3', '12px'],
            ['--wk-sp-4', '16px'],
            ['--wk-sp-5', '20px'],
            ['--wk-sp-6', '24px'],
            ['--wk-sp-8', '32px'],
            ['--wk-sp-10', '40px'],
            ['--wk-sp-12', '48px'],
          ].map(([name, px]) => <SpacingSwatch key={name} name={name} px={px} />)}
        </Section>

        <Section title="🔵 圆角">
          {[
            ['--wk-r-xs', '4px'],
            ['--wk-r-sm', '6px'],
            ['--wk-r-md', '10px'],
            ['--wk-r-lg', '14px'],
            ['--wk-r-xl', '20px'],
            ['--wk-r-full', '9999px'],
          ].map(([name, px]) => <RadiusSwatch key={name} name={name} px={px} />)}
        </Section>

        <Section title="✍️ 排版">
          <TypographySwatch label="h1 — 700 28px/1.25" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25 }} />
          <TypographySwatch label="h2 — 700 22px/1.3" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3 }} />
          <TypographySwatch label="h3 — 600 16px/1.35" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35 }} />
          <TypographySwatch label="body — 400 14px/1.5" style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5 }} />
          <TypographySwatch label="body-medium — 500 14px/1.5" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5 }} />
          <TypographySwatch label="caption — 400 12px/1.5" style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.5 }} />
          <TypographySwatch label="tiny — 500 10px/1.4" style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.4 }} />
          <TypographySwatch label="code — 400 13px/1.6 mono" style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.6, fontFamily: 'var(--wk-font-mono)' }} />
        </Section>

        <Section title="🌑 阴影">
          {[
            { name: '--wk-shadow-sm', label: 'sm — 细微投影' },
            { name: '--wk-shadow-md', label: 'md — 卡片/下拉' },
            { name: '--wk-shadow-lg', label: 'lg — Modal/浮层' },
            { name: '--wk-shadow-glow', label: 'glow — 品牌发光' },
          ].map(({ name, label }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 80, height: 48, borderRadius: 8, flexShrink: 0,
                background: 'var(--wk-bg-surface)',
                boxShadow: `var(${name})`,
              }} />
              <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
                <div>{name}</div>
                <div style={{ opacity: 0.5, fontSize: 12 }}>{label}</div>
              </div>
            </div>
          ))}
        </Section>

        <Section title="📦 Z-index 层级">
          {[
            ['--wk-z-base', '0', '默认'],
            ['--wk-z-raised', '10', '浮起元素'],
            ['--wk-z-sticky', '50', '吸顶/固定'],
            ['--wk-z-dropdown', '100', '下拉菜单'],
            ['--wk-z-modal', '200', 'Modal/抽屉'],
            ['--wk-z-toast', '300', 'Toast 通知'],
            ['--wk-z-tooltip', '400', 'Tooltip'],
          ].map(([name, value, desc]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 48, height: 28, borderRadius: 4, flexShrink: 0,
                background: `hsl(${Number(value) / 4 + 240}, 70%, 60%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#fff', fontWeight: 600,
              }}>{value}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
                {name} <span style={{ opacity: 0.5 }}>— {desc}</span>
              </div>
            </div>
          ))}
        </Section>

        <Section title="⏱ 动画">
          {[
            { label: 'fast — 150ms', dur: '150ms' },
            { label: 'default — 200ms', dur: '200ms' },
            { label: 'slow — 350ms', dur: '350ms' },
          ].map(({ label, dur }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div
                style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--wk-brand-primary)', cursor: 'pointer', transition: `transform ${dur} var(--wk-ease)` }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
              <div style={{ fontSize: 13, fontFamily: 'monospace' }}>{label} — hover 看效果</div>
            </div>
          ))}
        </Section>
      </div>
    </div>
  )
}

const meta: Meta = {
  title: 'Design System/Design Tokens',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'DMWork v4 设计 Token 全览。切换右上角 Theme 查看亮/暗色效果。',
      },
    },
  },
}

export default meta

export const AllTokens: StoryObj = {
  name: '所有 Token',
  render: () => <DesignTokensPage />,
}
