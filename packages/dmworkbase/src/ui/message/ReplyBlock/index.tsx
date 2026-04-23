import React from 'react'
import './index.css'

export interface ReplyBlockProps {
  /** 被引用消息的发送者名字 */
  fromName: string
  /** 引用内容摘要 */
  digest: string
  /** 点击跳转到原消息 */
  onClick?: () => void
}

/**
 * ReplyBlock — 引用消息块
 *
 * 对齐 Figma 387:62976
 * - 背景 rgba(28,28,35,0.03)，圆角 6px
 * - 左侧 2px 竖条 rgba(28,28,35,0.40)
 * - 发送者名：12px，rgba(28,28,35,0.60)
 * - 摘要：12px，rgba(28,28,35,0.60)，单行截断
 */
export default function ReplyBlock({ fromName, digest, onClick }: ReplyBlockProps) {
  return (
    <div className="wk-reply-block" onClick={onClick}>
      <div className="wk-reply-block__bar" />
      <div className="wk-reply-block__content">
        <span className="wk-reply-block__name">{fromName}</span>
        <span className="wk-reply-block__digest">{digest}</span>
      </div>
    </div>
  )
}
