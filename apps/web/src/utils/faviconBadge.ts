/**
 * faviconBadge.ts
 * 在浏览器 Tab favicon 上叠加未读数角标。
 * - count 0：恢复原始 favicon
 * - 1~99：显示数字
 * - >99：显示 "99+"
 */

const FAVICON_SIZE = 32
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
  const badgeRadius = size * 0.28
  const cx = size - badgeRadius
  const cy = badgeRadius

  ctx.beginPath()
  if (isLong) {
    // 拉长椭圆形
    const rx = badgeRadius * 1.4
    const ry = badgeRadius
    ctx.ellipse(cx - rx * 0.15, cy, rx, ry, 0, 0, Math.PI * 2)
  } else {
    ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2)
  }
  ctx.fillStyle = BADGE_COLOR
  ctx.fill()

  ctx.fillStyle = BADGE_TEXT_COLOR
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const fontSize = isLong ? Math.floor(size * 0.22) : Math.floor(size * 0.26)
  ctx.font = `bold ${fontSize}px -apple-system, sans-serif`
  const textX = isLong ? cx - badgeRadius * 0.15 : cx
  ctx.fillText(text, textX, cy)
}

function renderBadge(img: HTMLImageElement | null, text: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = FAVICON_SIZE
  canvas.height = FAVICON_SIZE
  const ctx = canvas.getContext('2d')!

  if (img) {
    ctx.drawImage(img, 0, 0, FAVICON_SIZE, FAVICON_SIZE)
  } else {
    // 加载失败兜底：纯色圆角背景（手动绘制，避免 roundRect 兼容性问题）
    const r = 6
    const w = FAVICON_SIZE
    const h = FAVICON_SIZE
    ctx.fillStyle = FALLBACK_BG_COLOR
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(w - r, 0)
    ctx.quadraticCurveTo(w, 0, w, r)
    ctx.lineTo(w, h - r)
    ctx.quadraticCurveTo(w, h, w - r, h)
    ctx.lineTo(r, h)
    ctx.quadraticCurveTo(0, h, 0, h - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.fill()
  }

  drawBadge(ctx, text, FAVICON_SIZE)
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
    const dataUrl = renderBadge(img, text)
    getFaviconLink().href = dataUrl
  }

  img.onerror = () => {
    // 原图加载失败，用兜底色
    const dataUrl = renderBadge(null, text)
    getFaviconLink().href = dataUrl
  }

  img.src = src
}

export function clearFaviconBadge(): void {
  if (typeof document === 'undefined') return

  const href = originalFaviconHref || '/favicon.ico'
  getFaviconLink().href = href
}
