import React from 'react';
import type { ChannelPickerItem } from './types';
import ThreadIcon from '../Icons/ThreadIcon';

interface ChannelItemProps {
  item: ChannelPickerItem;
  isSelected: boolean;
  /** 缩进层级：0=频道, 1=子区 */
  level?: number;
  /** 是否为私聊模式 */
  isPrivate?: boolean;
  onClick: () => void;
}

/** 根据名字生成一个确定性渐变色 */
function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1},65%,55%), hsl(${h2},65%,45%))`;
}

/** 格式化时间为相对描述 */
function formatTime(ts: number): string {
  if (!ts) return '';
  const now = Date.now();
  const diff = now - ts * (ts < 1e12 ? 1000 : 1); // 兼容秒/毫秒
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(ts * (ts < 1e12 ? 1000 : 1)).toLocaleDateString();
}

export default function ChannelItem({
  item,
  isSelected,
  level = 0,
  isPrivate = false,
  onClick,
}: ChannelItemProps) {
  const cls = [
    'wk-channel-picker-item',
    `wk-channel-picker-level-${level}`,
    isSelected && 'is-current',
    item.muted && 'is-muted',
    isPrivate && 'wk-channel-picker-pm',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={cls} onClick={onClick}>
      {/* 图标 / 头像 */}
      <span className="wk-channel-picker-icon">
        {isPrivate ? (
          // 私聊：圆形渐变头像 + 首字母
          <span
            className="wk-channel-picker-avatar"
            style={{ background: avatarGradient(item.name) }}
          >
            {item.name.charAt(0).toUpperCase()}
          </span>
        ) : item.channelType === 5 ? (
          // 子区：线程图标
          <span className="wk-channel-picker-thread-icon">
            <ThreadIcon size={14} color="currentColor" />
          </span>
        ) : (
          // 普通频道
          <span className="wk-channel-picker-hash">#</span>
        )}
      </span>

      {/* 主内容 */}
      <span className="wk-channel-picker-main">
        <span className="wk-channel-picker-row1">
          <span className="wk-channel-picker-name">{item.name}</span>
          {isPrivate && item.lastMessageTime > 0 && (
            <span className="wk-channel-picker-time">
              {formatTime(item.lastMessageTime)}
            </span>
          )}
        </span>
      </span>

      {/* 静音图标 */}
      {item.muted && (
        <span className="wk-channel-picker-muted-icon" title="免打扰">
          🔇
        </span>
      )}

      {/* @ 提醒角标 */}
      {item.mentionCount > 0 && (
        <span className="wk-channel-picker-mention">
          @{item.mentionCount}
        </span>
      )}

      {/* 未读角标 */}
      {item.unread > 0 && item.mentionCount === 0 && (
        <span
          className={
            item.muted
              ? 'wk-channel-picker-unread-muted'
              : 'wk-channel-picker-unread'
          }
        >
          {item.unread > 99 ? '99+' : item.unread}
        </span>
      )}
    </button>
  );
}
