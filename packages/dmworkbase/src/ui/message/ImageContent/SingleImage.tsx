import React, { useRef, useState, useEffect } from 'react'
import './index.css'

export interface SingleImageProps {
  /** 图片 URL */
  src: string
  
  /** 原始宽度 */
  width: number
  
  /** 原始高度 */
  height: number
  
  /** 点击回调 */
  onClick?: () => void
}

const FALLBACK_MAX_WIDTH = 660
const MAX_HEIGHT = 372

/**
 * 单图消息组件
 *
 * @description 显示单张图片，宽度自适应容器（最大 660px），高度上限 372px，按比例缩放（Figma 334:14414）
 */
export default function SingleImage({
  src,
  width,
  height,
  onClick,
}: SingleImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [maxWidth, setMaxWidth] = useState(FALLBACK_MAX_WIDTH)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const available = entry.contentRect.width
        // 容器实际宽度为 0 时（首次挂载前）用 fallback，否则取实际宽度上限
        setMaxWidth(available > 0 ? Math.min(available, FALLBACK_MAX_WIDTH) : FALLBACK_MAX_WIDTH)
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 按比例缩放
  let displayWidth = width
  let displayHeight = height

  if (width > maxWidth || height > MAX_HEIGHT) {
    const widthRatio = maxWidth / width
    const heightRatio = MAX_HEIGHT / height
    const ratio = Math.min(widthRatio, heightRatio)

    displayWidth = Math.round(width * ratio)
    displayHeight = Math.round(height * ratio)
  }

  return (
    <div
      ref={containerRef}
      className="wk-msg-single-image-wrap"
    >
      <div
        className="wk-msg-single-image"
        style={{ width: displayWidth, height: displayHeight }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <img
          src={src}
          alt=""
          width={displayWidth}
          height={displayHeight}
        />
      </div>
    </div>
  )
}
