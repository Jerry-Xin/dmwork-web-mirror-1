import React from 'react'
import classNames from 'classnames'
import Avatar from '../Avatar'
import Timestamp from '../Timestamp'
import './index.css'

export interface MessageRowProps {
  /** 是否为发送方消息（控制布局方向） */
  isSend: boolean
  
  /** 是否为连续消息（同一发送者的连续消息，头像占位但隐藏） */
  isContinue: boolean
  
  /** 是否被选中（多选模式） */
  isSelected: boolean
  
  /** 是否显示头像 */
  showAvatar: boolean
  
  /** 头像 URL */
  avatarUrl: string
  
  /** 发送者名称 */
  senderName: string
  
  /** 时间戳（格式化后的字符串） */
  timestamp: string

  /** 仅时间部分（HH:mm），连续消息 hover 时显示 */
  timeOnly?: string
  
  /** 发送者是否在线（可选） */
  isOnline?: boolean
  
  /** 选择状态变化回调 */
  onSelect?: (selected: boolean) => void
  
  /** 消息内容（子组件） */
  children: React.ReactNode
  
  /** 是否显示多选 Checkbox */
  showCheckbox?: boolean
  
  /** 右键菜单事件 */
  onContextMenu?: (event: React.MouseEvent) => void

  /** 行点击事件（多选模式整行可点） */
  onClick?: () => void

  /** 右键菜单打开时保持 hover 高亮 */
  isActive?: boolean

  /** 头像点击回调（私聊场景：点头像打开私聊） */
  onAvatarClick?: (e: React.MouseEvent) => void

  /** 发送者名称点击回调（@ 场景：点名字展示用户信息） */
  onSenderNameClick?: () => void
}

/**
 * 消息行容器组件
 * 
 * @description 控制消息的整体布局、头像、时间戳、hover 态等
 * 
 * 布局规则：
 * - 接收方消息：头像在左，内容在右
 * - 发送方消息：内容在左，头像在右（头像可选）
 * - 连续消息：头像占位但隐藏（visibility: hidden）
 * - Hover 时：背景色 rgba(28,28,35,0.04)
 */
export default function MessageRow({
  isSend,
  isContinue,
  isSelected,
  showAvatar,
  avatarUrl,
  senderName,
  timestamp,
  timeOnly,
  isOnline,
  onSelect,
  children,
  showCheckbox = false,
  onContextMenu,
  onClick,
  isActive,
  onAvatarClick,
  onSenderNameClick,
}: MessageRowProps) {
  return (
    <div
      className={classNames(
        'wk-msg-row',
        isSend && 'wk-msg-row--send',
        isContinue && 'wk-msg-row--continue',
        isSelected && 'wk-msg-row--selected',
        showCheckbox && 'wk-msg-row--selecting',
        isActive && 'wk-msg-row--active',
      )}
      onContextMenu={onContextMenu}
      onClick={onClick}
    >
      {/* 多选 Checkbox */}
      {showCheckbox && (
        <div
          className="wk-msg-row-checkbox"
          onClick={(e) => {
            e.stopPropagation()
            onSelect?.(!isSelected)
          }}
        >
          <div className={classNames(
            'wk-msg-row-checkbox-inner',
            isSelected && 'wk-msg-row-checkbox-inner--checked'
          )}>
            {isSelected && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 3.5L3.8 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
      )}
      
      {/* 头像（所有消息都在左侧） */}
      <div className="wk-msg-row-avatar">
        {showAvatar && (
          <Avatar
            src={avatarUrl}
            size={36}
            isOnline={isOnline}
            showOnlineDot
            alt={senderName}
            onClick={onAvatarClick}
          />
        )}
        {/* 连续消息：头像占位,hover 时显示时间戳 */}
        {!showAvatar && isContinue && (
          <div className="wk-msg-row-avatar-placeholder">
            <span className="wk-msg-row-timestamp-hover">{timeOnly ?? timestamp}</span>
          </div>
        )}
      </div>
      
      {/* 消息内容区 */}
      <div className="wk-msg-row-content">
        {/* 发送者名称 + 时间戳（非连续消息时显示） */}
        {!isContinue && (
          <div className="wk-msg-row-header">
            <span
              className="wk-msg-row-sender"
              style={{ cursor: onSenderNameClick ? 'pointer' : undefined }}
              onClick={onSenderNameClick}
            >{senderName}</span>
            <span className="wk-msg-row-timestamp">{timestamp}</span>
          </div>
        )}
        
        {/* 消息体 */}
        <div className="wk-msg-row-body">
          {children}
        </div>
      </div>
    </div>
  )
}
