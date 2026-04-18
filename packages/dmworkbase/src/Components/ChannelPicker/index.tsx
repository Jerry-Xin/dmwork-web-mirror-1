import React, { useMemo, useState } from 'react';
import type { ChannelPickerProps, ChannelPickerItem } from './types';
import ChannelItem from './ChannelItem';
import './index.css';

/** 搜索图标 SVG */
const SearchIcon = () => (
  <svg
    className="wk-channel-picker-search-icon"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="7" cy="7" r="5" />
    <path d="M14 14l-3.5-3.5" />
  </svg>
);

/** 刷新图标 SVG */
const RefreshIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8a6 6 0 0110.5-4" />
    <path d="M14 8a6 6 0 01-10.5 4" />
    <polyline points="12.5 2 12.5 5 9.5 5" />
    <polyline points="3.5 14 3.5 11 6.5 11" />
  </svg>
);

/** 新建图标 SVG */
const PlusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export type { ChannelPickerItem, ChannelPickerProps };
export type { ChannelPickerCategory } from './types';

export default function ChannelPicker({
  channels,
  categories,
  privateChats,
  selectedId,
  onSelect,
  onClose,
  onRefresh,
  onCreate,
  showSearch = true,
  loading = false,
}: ChannelPickerProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'group' | 'private'>('group');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [expandedThreadParents, setExpandedThreadParents] = useState<Set<string>>(new Set());

  // 统计未读数
  const groupUnread = useMemo(
    () => channels.reduce((sum: number, c: ChannelPickerItem) => sum + (c.muted ? 0 : c.unread), 0),
    [channels],
  );
  const privateUnread = useMemo(
    () => privateChats.reduce((sum: number, c: ChannelPickerItem) => sum + (c.muted ? 0 : c.unread), 0),
    [privateChats],
  );

  // 搜索过滤
  const lowerQuery = query.trim().toLowerCase();

  const filteredChannels = useMemo(() => {
    if (!lowerQuery) return channels;
    return channels.filter((c) => c.name.toLowerCase().includes(lowerQuery));
  }, [channels, lowerQuery]);

  const filteredPrivateChats = useMemo(() => {
    if (!lowerQuery) return privateChats;
    return privateChats.filter((c) => c.name.toLowerCase().includes(lowerQuery));
  }, [privateChats, lowerQuery]);

  // 按分类组织频道 + 子区
  const categoryTree = useMemo(() => {
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

    // 从 channels 中分离出子区和普通频道
    const threads = filteredChannels.filter((c) => c.channelType === 5 && c.parentChannelId);
    const normalChannels = filteredChannels.filter((c) => c.channelType !== 5 || !c.parentChannelId);

    // 子区按父频道分组
    const threadsByParent = new Map<string, ChannelPickerItem[]>();
    for (const t of threads) {
      const list = threadsByParent.get(t.parentChannelId!) || [];
      list.push(t);
      threadsByParent.set(t.parentChannelId!, list);
    }

    // 按分类分组
    const channelsByCategory = new Map<string, ChannelPickerItem[]>();
    const uncategorized: ChannelPickerItem[] = [];

    for (const ch of normalChannels) {
      if (ch.categoryId) {
        const list = channelsByCategory.get(ch.categoryId) || [];
        list.push(ch);
        channelsByCategory.set(ch.categoryId, list);
      } else {
        uncategorized.push(ch);
      }
    }

    return { sortedCategories, channelsByCategory, uncategorized, threadsByParent };
  }, [filteredChannels, categories]);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const toggleThreadExpand = (parentId: string) => {
    setExpandedThreadParents((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const renderChannelWithThreads = (ch: ChannelPickerItem) => {
    const threads = categoryTree.threadsByParent.get(ch.channelId) || [];
    const isExpanded = expandedThreadParents.has(ch.channelId);
    const threadMentionCount = threads.reduce((sum: number, t: ChannelPickerItem) => sum + t.mentionCount, 0);

    return (
      <React.Fragment key={ch.channelId}>
        <ChannelItem
          item={ch}
          isSelected={ch.channelId === selectedId}
          level={0}
          onClick={() => onSelect(ch)}
        />
        {threads.length > 0 && !isExpanded && (
          <button
            className={`wk-channel-picker-more-subs${threadMentionCount > 0 ? ' has-mention' : ''}`}
            onClick={() => toggleThreadExpand(ch.channelId)}
          >
            + {threads.length} 个子区
            {threadMentionCount > 0 && (
              <span className="wk-channel-picker-row-mention">@{threadMentionCount}</span>
            )}
          </button>
        )}
        {threads.length > 0 && isExpanded && (
          <>
            {threads.map((t) => (
              <ChannelItem
                key={t.channelId}
                item={t}
                isSelected={t.channelId === selectedId}
                level={1}
                onClick={() => onSelect(t)}
              />
            ))}
            <button
              className="wk-channel-picker-more-subs"
              onClick={() => toggleThreadExpand(ch.channelId)}
            >
              收起子区
            </button>
          </>
        )}
      </React.Fragment>
    );
  };

  const renderGroupList = () => {
    const { sortedCategories, channelsByCategory, uncategorized } = categoryTree;

    if (filteredChannels.length === 0) {
      return <div className="wk-channel-picker-empty">未找到频道</div>;
    }

    return (
      <>
        {/* 有分类的频道 */}
        {sortedCategories.map((cat) => {
          const catChannels = channelsByCategory.get(cat.id) || [];
          if (catChannels.length === 0 && lowerQuery) return null;
          const isCollapsed = collapsedCategories.has(cat.id);

          return (
            <div key={cat.id} className="wk-channel-picker-cat-group">
              <button
                className="wk-channel-picker-cat"
                onClick={() => toggleCategory(cat.id)}
              >
                <span className="wk-channel-picker-cat-arrow">
                  {isCollapsed ? '▸' : '▾'}
                </span>
                <span className="wk-channel-picker-cat-name">{cat.name}</span>
              </button>
              {!isCollapsed &&
                catChannels.map((ch) => renderChannelWithThreads(ch))}
            </div>
          );
        })}

        {/* 未分类频道 */}
        {uncategorized.length > 0 && (
          <div className="wk-channel-picker-cat-group">
            {sortedCategories.length > 0 && (
              <div className="wk-channel-picker-cat-static">未分类</div>
            )}
            {uncategorized.map((ch) => renderChannelWithThreads(ch))}
          </div>
        )}
      </>
    );
  };

  const renderPrivateList = () => {
    if (filteredPrivateChats.length === 0) {
      return <div className="wk-channel-picker-empty">未找到联系人</div>;
    }

    return filteredPrivateChats.map((item) => (
      <ChannelItem
        key={item.channelId}
        item={item}
        isSelected={item.channelId === selectedId}
        isPrivate
        onClick={() => onSelect(item)}
      />
    ));
  };

  return (
    <div className="wk-channel-picker">
      {/* 搜索栏 */}
      {showSearch && (
        <div className="wk-channel-picker-search">
          <div className="wk-channel-picker-search-input-wrap">
            <SearchIcon />
            <input
              className="wk-channel-picker-search-input"
              placeholder="搜索 Channel / Thread / 联系人"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          {onRefresh && (
            <button
              className="wk-channel-picker-icon-btn"
              title="刷新"
              onClick={onRefresh}
            >
              <RefreshIcon />
            </button>
          )}
          {onCreate && (
            <button
              className="wk-channel-picker-icon-btn"
              title="新建"
              onClick={onCreate}
            >
              <PlusIcon />
            </button>
          )}
        </div>
      )}

      {/* Tab 切换 */}
      <div className="wk-channel-picker-tabs">
        <button
          className={`wk-channel-picker-tab${activeTab === 'group' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('group')}
        >
          群聊
          {groupUnread > 0 && (
            <span className="wk-channel-picker-tab-badge">
              {groupUnread > 99 ? '99+' : groupUnread}
            </span>
          )}
        </button>
        <button
          className={`wk-channel-picker-tab${activeTab === 'private' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('private')}
        >
          私聊
          {privateUnread > 0 && (
            <span className="wk-channel-picker-tab-badge">
              {privateUnread > 99 ? '99+' : privateUnread}
            </span>
          )}
        </button>
      </div>

      {/* 列表区 */}
      <div className="wk-channel-picker-list">
        {loading ? (
          <div className="wk-channel-picker-loading">加载中…</div>
        ) : activeTab === 'group' ? (
          renderGroupList()
        ) : (
          renderPrivateList()
        )}
      </div>
    </div>
  );
}
