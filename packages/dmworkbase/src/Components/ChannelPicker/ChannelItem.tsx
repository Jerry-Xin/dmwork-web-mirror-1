import React from 'react';
import type { ChannelPickerItem } from './types';
import ThreadIcon from '../Icons/ThreadIcon';
import { getTitleColor } from '../../Utils/titleColor';

interface ChannelItemProps {
  item: ChannelPickerItem;
  isSelected: boolean;
  /** 缩进层级：0=频道, 1=子区 */
  level?: number;
  /** 是否为私聊模式 */
  isPrivate?: boolean;
  onClick: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
  onContextMenu,
}: ChannelItemProps) {
  const avatarBackground = getTitleColor(item.name);
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
    <button className={cls} onClick={onClick} onContextMenu={onContextMenu}>
      {/* 图标 / 头像 */}
      <span className="wk-channel-picker-icon">
        {isPrivate ? (
          // 私聊：圆形头像 + 首字母，背景色与消息用户名配色规则一致
          <span
            className="wk-channel-picker-avatar"
            style={{ background: avatarBackground }}
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
