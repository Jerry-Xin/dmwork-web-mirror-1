/**
 * DMWork v4 Design Tokens — TypeScript
 * Source: 设计标准.html
 *
 * 用途：
 * - JS 动态样式（inline style、canvas、动画）
 * - Storybook args 默认值
 * - 单元测试 snapshot 验证
 */

export const colors = {
  brand: {
    primary:      '#7C5CFC',
    primaryHover: '#6B4FD8',
    secondary:    '#00D4AA',
    glow:         'rgba(124, 92, 252, 0.3)',
  },
  semantic: {
    success: '#00D4AA',
    warning: '#FFAD33',
    error:   '#FF5C72',
    info:    '#5C9AFF',
  },
  ai: {
    surface: 'rgba(124, 92, 252, 0.04)',
    border:  'rgba(124, 92, 252, 0.12)',
    glow:    'rgba(124, 92, 252, 0.06)',
  },
  dark: {
    bgDeep:     '#111318',
    bgBase:     '#171921',
    bgSurface:  '#1E212B',
    bgElevated: '#262A36',
    bgHover:    '#2E3240',
    bgActive:   '#363B4A',
    textPrimary:   '#E4E6ED',
    textSecondary: '#9CA1B3',
    textTertiary:  '#7A7F96',
    textAccent:    '#B0A4FF',
    borderSubtle:  'rgba(255, 255, 255, 0.04)',
    borderDefault: 'rgba(255, 255, 255, 0.07)',
    borderStrong:  'rgba(255, 255, 255, 0.12)',
    borderGlow:    'rgba(124, 92, 252, 0.2)',
  },
  light: {
    bgDeep:     '#F7F8FA',
    bgBase:     '#FFFFFF',
    bgSurface:  '#F0F1F5',
    bgElevated: '#EAEBF0',
    bgHover:    '#E2E3EA',
    bgActive:   '#D8DAE5',
    textPrimary:   '#111318',
    textSecondary: '#5C6070',
    textTertiary:  '#9498A8',
    textAccent:    '#7C5CFC',
    borderSubtle:  'rgba(0, 0, 0, 0.05)',
    borderDefault: 'rgba(0, 0, 0, 0.08)',
    borderStrong:  'rgba(0, 0, 0, 0.12)',
    borderGlow:    'rgba(124, 92, 252, 0.2)',
  },
} as const

export const spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
} as const

export const radius = {
  xs:   4,
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
} as const

export const typography = {
  fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Noto Sans SC', sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  sizes: {
    h1:      28,
    h2:      22,
    h3:      16,
    h4:      14,
    body:    14,
    caption: 12,
    tiny:    10,
    code:    13,
  },
  weights: {
    regular: 400,
    medium:  500,
    semibold:600,
    bold:    700,
  },
  lineHeights: {
    tight:  1.25,
    normal: 1.5,
    relaxed:1.65,
    code:   1.6,
  },
} as const

export const animation = {
  ease:       'cubic-bezier(0.16, 1, 0.3, 1)',
  easeBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  durFast:    150,
  dur:        200,
  durSlow:    350,
} as const

export const layout = {
  navWidth:      60,
  sidebarWidth:  280,
  taskRailWidth: 320,
} as const

/** CSS 变量名映射（用于 debug.js inspect 验证） */
export const cssVarNames = {
  brandPrimary:   '--wk-brand-primary',
  bgBase:         '--wk-bg-base',
  bgElevated:     '--wk-bg-elevated',
  textPrimary:    '--wk-text-primary',
  textSecondary:  '--wk-text-secondary',
  borderDefault:  '--wk-border-default',
  borderGlow:     '--wk-border-glow',
  aiSurface:      '--wk-ai-surface',
  aiBorder:       '--wk-ai-border',
} as const

export type ColorToken = keyof typeof colors.dark
export type SpacingToken = keyof typeof spacing
export type RadiusToken = keyof typeof radius
