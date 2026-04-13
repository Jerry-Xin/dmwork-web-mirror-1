/**
 * faviconBadge.ts
 * 在浏览器 Tab favicon 上叠加未读数角标。
 * - count 0：恢复原始 favicon
 * - 1~99：显示数字（圆形角标，右下角）
 * - >99：显示 "99+"
 *
 * 设计参考 Discord：大面积角标、粗字体、无描边、贴底部
 */

const RENDER_SIZE = 128
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
  const isLong = text.length > 2  // "99+"
  const isTwoDigit = text.length === 2

  // 角标高度固定为图标高度的 38%，宽度随文字自适应
  const badgeH = size * 0.38
  const ry = badgeH / 2  // 胶囊圆角半径 = 高度一半

  // 宽度：单数字=正圆，双数字/99+=胶囊
  const rx = isLong
    ? ry * 2.0   // "99+" 更宽
    : isTwoDigit
      ? ry * 1.5  // 两位数略宽
      : ry         // 单数字正圆

  // 贴右下角，不超出边界
  const cx = size - rx
  const cy = size - ry

  // 红色胶囊（无描边，直接覆盖）
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = BADGE_COLOR
  ctx.fill()

  // 粗字体，字号尽量撑满圆形高度
  const fontSize = Math.round(ry * 1.3)
  ctx.fillStyle = BADGE_TEXT_COLOR
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.fillText(text, cx, cy + ry * 0.05)  // 视觉垂直居中微调
}

function renderBadge(img: HTMLImageElement | null, text: string): string {
  const size = RENDER_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { alpha: true })!
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
  if (typeof document === 'undefined') return

  saveOriginalFavicon()

  const text = count > 99 ? '99+' : String(count)
  const src = originalFaviconHref || '/favicon.ico'

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => { getFaviconLink().href = renderBadge(img, text) }
  img.onerror = () => { getFaviconLink().href = renderBadge(null, text) }
  img.src = src
}

export function clearFaviconBadge(): void {
  if (typeof document === 'undefined') return
  getFaviconLink().href = originalFaviconHref || '/favicon.ico'
}
