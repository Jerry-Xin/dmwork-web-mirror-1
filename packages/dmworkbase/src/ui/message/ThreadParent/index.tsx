import React from 'react'
import ThreadBadge from '../ThreadBadge'
import './index.css'

export interface ThreadParentProps {
  /** 消息内容 */
  children: React.ReactNode
  
  /** 回复数量 */
  replyCount: number
  
  /** 参与者列表 */
  participants: Array<{
    uid: string
    avatarUrl: string
  }>
  
  /** 最后回复时间 */
  lastReplyTime: string
  
  /** 点击 Thread 徽章回调 */
  onThreadClick?: () => void
}

/**
 * Thread 父消息容器组件
 * 
 * @description 带灰色背景 + 左侧蓝条的消息容器（Figma 318:6276）
 * 
 * 样式规则：
 * - 背景色：浅灰
 * - 左侧蓝条：4px，品牌色
 * - 圆角：var(--wk-r-lg)
 * - 内边距：var(--wk-sp-3)
 * - 底部显示 ThreadBadge（回复统计）
 */
export default function ThreadParent({
  children,
  replyCount,
  participants,
  lastReplyTime,
  onThreadClick
}: ThreadParentProps) {
  return (
    <div className="wk-msg-thread-parent">
      <div className="wk-msg-thread-parent-content">
        {children}
      </div>
      
      <ThreadBadge
        replyCount={replyCount}
        participants={participants}
        lastReplyTime={lastReplyTime}
        onClick={onThreadClick}
      />
    </div>
  )
}
