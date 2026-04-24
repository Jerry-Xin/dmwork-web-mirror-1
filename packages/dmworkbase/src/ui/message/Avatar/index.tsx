import React from 'react'
import './index.css'

export interface AvatarProps {
  /** 头像 URL */
  src: string
  
  /** 头像尺寸（默认 32px） */
  size?: number
  
  /** 是否在线 */
  isOnline?: boolean
  
  /** 是否显示在线状态点 */
  showOnlineDot?: boolean
  
  /** alt 文本 */
  alt?: string

  /** 头像点击回调 */
  onClick?: (e: React.MouseEvent) => void
}

/**
 * 消息头像组件
 * 
 * @description 显示用户头像，支持在线状态点（右下角绿点）
 */
export default function Avatar({
  src,
  size = 32,
  isOnline,
  showOnlineDot,
  alt = '头像',
  onClick,
}: AvatarProps) {
  return (
    <div
      className="wk-msg-avatar"
      style={{ width: size, height: size, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        className="wk-msg-avatar-img"
      />
      {showOnlineDot && isOnline && (
        <span className="wk-msg-avatar-online-dot" />
      )}
    </div>
  )
}
