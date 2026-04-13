/**
 * faviconBadge.ts
 * 在浏览器 Tab favicon 上叠加未读数角标。
 * - count 0：恢复原始 favicon
 * - 1~99：显示数字
 * - >99：显示 "99+"
 *
 * 实现策略：
 * 用 128px canvas 高分辨率渲染后输出为 dataURL，
 * 浏览器 tab 在 ~16-32px 显示时自动降采样，清晰度更好。
 */

const RENDER_SIZE = 128        // 高分辨率渲染尺寸
const BADGE_COLOR = '#e53935'
const BADGE_TEXT_COLOR = '#ffffff'
const FALLBACK_BG_COLOR = '#5b6abf'

let originalFaviconHref: string | null = null

function getFaviconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  return link
}

function saveOriginalFavicon(): void {
  if (originalFaviconHref !== null) return
  const link = getFaviconLink()
  originalFaviconHref = link.href || '/favicon.ico'
}

function drawBadge(ctx: CanvasRenderingContext2D, text: string, size: number): void {
  const isLong = text.length > 2 // "99+"

  // 角标半径：单数字用圆，双数字/99+ 用胶囊形
  const r = size * 0.26

  // 右下角，长文本往中间挤保证不超出边界
  const inset = isLong ? r * 0.6 : 0
  const cx = size - r - inset
  const cy = size - r - inset

  // ── 白色描边（分离角标与图标背景）──
  const strokeW = size * 0.04
  ctx.beginPath()
  if (isLong) {
    const rx = r * 1.55
    const ry = r
    ctx.ellipse(cx, cy, rx + strokeW, ry + strokeW, 0, 0, Math.PI * 2)
  } else {
    ctx.arc(cx, cy, r + strokeW, 0, Math.PI * 2)
  }
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  // ── 红色主体 ──
  ctx.beginPath()
  if (isLong) {
    const rx = r * 1.55
    const ry = r
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  } else {
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  }
  ctx.fillStyle = BADGE_COLOR
  ctx.fill()

  // ── 数字文本 ──
  // 使用系统 UI 字体，开启抗锯齿
  const fontSize = isLong
    ? Math.round(size * 0.24)
    : text.length === 1
      ? Math.round(size * 0.30)
      : Math.round(size * 0.26)

  ctx.fillStyle = BADGE_TEXT_COLOR
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // system-ui 在各平台都有好的渲染效果
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.fillText(text, cx, cy + size * 0.01) // 微调垂直对齐
}

function renderBadge(img: HTMLImageElement | null, text: string): string {
  const size = RENDER_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { alpha: true })!

  // 开启高质量缩放
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (img) {
    ctx.drawImage(img, 0, 0, size, size)
  } else {
    // 加载失败兜底：品牌色圆角矩形
    const rad = size * 0.18
    ctx.fillStyle = FALLBACK_BG_COLOR
    ctx.beginPath()
    ctx.moveTo(rad, 0)
    ctx.lineTo(size - rad, 0)
    ctx.quadraticCurveTo(size, 0, size, rad)
    ctx.lineTo(size, size - rad)
    ctx.quadraticCurveTo(size, size, size - rad, size)
    ctx.lineTo(rad, size)
    ctx.quadraticCurveTo(0, size, 0, size - rad)
    ctx.lineTo(0, rad)
    ctx.quadraticCurveTo(0, 0, rad, 0)
    ctx.closePath()
    ctx.fill()
  }

  drawBadge(ctx, text, size)
  return canvas.toDataURL('image/png')
}

export function setFaviconBadge(count: number): void {
  if (typeof document === 'undefined') return // SSR 安全

  saveOriginalFavicon()

  const text = count > 99 ? '99+' : String(count)
  const src = originalFaviconHref || '/favicon.ico'

  const img = new Image()
  img.crossOrigin = 'anonymous'

  img.onload = () => {
    getFaviconLink().href = renderBadge(img, text)
  }

  img.onerror = () => {
    getFaviconLink().href = renderBadge(null, text)
  }

  img.src = src
}

export function clearFaviconBadge(): void {
  if (typeof document === 'undefined') return
  getFaviconLink().href = originalFaviconHref || '/favicon.ico'
}
