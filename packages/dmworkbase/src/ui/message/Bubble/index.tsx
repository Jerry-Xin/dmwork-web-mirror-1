import React from 'react'
import classNames from 'classnames'
import './index.css'

export interface BubbleProps {
  /** 气泡位置（影响圆角） */
  position: 'single' | 'first' | 'middle' | 'last'
  
  /** 是否为发送方消息（控制背景色和对齐方向） */
  isSend: boolean
  
  /** 自定义样式（用于特殊消息类型，如大表情透明背景） */
  style?: React.CSSProperties
  
  /** 气泡内容 */
  children: React.ReactNode
}

/**
 * 消息气泡组件
 * 
 * @description 包裹消息内容，提供背景色和圆角
 * 
 * 圆角规则：
 * - single: 全圆角（独立消息）
 * - first: 上圆下直（连续消息的第一条）
 * - middle: 全直（连续消息的中间）
 * - last: 上直下圆（连续消息的最后一条）
 */
export default function Bubble({
  position,
  isSend,
  style,
  children
}: BubbleProps) {
  return (
    <div
      className={classNames(
        'wk-msg-bubble',
        `wk-msg-bubble--${position}`,
        isSend ? 'wk-msg-bubble--send' : 'wk-msg-bubble--recv'
      )}
      style={style}
    >
      {children}
    </div>
  )
}
