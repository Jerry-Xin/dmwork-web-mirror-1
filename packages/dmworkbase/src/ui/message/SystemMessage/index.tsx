import React from 'react'
import SystemTag from '../SystemTag'
import './index.css'

export interface SystemMessageProps {
  /** 系统消息类型 */
  type: 'join' | 'leave' | 'revoke' | 'screenshot' | 'other'
  
  /** 消息文本 */
  text: string
  
  /** 用户头像（可选，用于入群/离群通知） */
  avatarUrl?: string
  
  /** 是否显示关闭按钮 */
  closable?: boolean
  
  /** 点击关闭回调 */
  onClose?: () => void
}

/**
 * 系统消息组件
 * 
 * @description 居中显示的系统通知，带胶囊背景（Figma 318:6276）
 * 
 * 样式规则：
 * - 居中对齐
 * - 灰色胶囊背景
 * - 文字颜色：rgba(28,28,35,0.6)
 */
export default function SystemMessage({
  type,
  text,
  avatarUrl,
  closable = false,
  onClose
}: SystemMessageProps) {
  return (
    <div className="wk-msg-system">
      <SystemTag
        text={text}
        avatarUrl={avatarUrl}
        closable={closable}
        onClose={onClose}
      />
    </div>
  )
}
