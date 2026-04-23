import React from 'react'
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

/**
 * 单图消息组件
 * 
 * @description 显示单张图片，最大 660×372，按比例缩放（Figma 334:14414）
 */
export default function SingleImage({
  src,
  width,
  height,
  onClick
}: SingleImageProps) {
  // 计算缩放后的尺寸
  const MAX_WIDTH = 660
  const MAX_HEIGHT = 372
  
  let displayWidth = width
  let displayHeight = height
  
  // 按比例缩放
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    const widthRatio = MAX_WIDTH / width
    const heightRatio = MAX_HEIGHT / height
    const ratio = Math.min(widthRatio, heightRatio)
    
    displayWidth = Math.round(width * ratio)
    displayHeight = Math.round(height * ratio)
  }
  
  return (
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
  )
}
