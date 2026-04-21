import React, { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ChannelPickerProps, ChannelPickerItem } from "./types";
import ChannelItem from "./ChannelItem";
import ContextMenus, {
  type ContextMenusContext,
  type ContextMenusData,
} from "../ContextMenus";
import "./index.css";

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
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 8a6 6 0 0110.5-4" />
    <path d="M14 8a6 6 0 01-10.5 4" />
    <polyline points="12.5 2 12.5 5 9.5 5" />
    <polyline points="3.5 14 3.5 11 6.5 11" />
  </svg>
);

/** 新建图标 SVG */
const PlusIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export type { ChannelPickerItem, ChannelPickerProps };
export type { ChannelPickerCategory, ChannelPickerLayoutMode } from "./types";

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
  layoutMode = "tabbed",
  loading = false,
  getItemContextMenus,
  getCategoryContextMenus,
}: ChannelPickerProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"group" | "private">("group");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );
  const [contextMenus, setContextMenus] = useState<ContextMenusData[]>([]);
  const contextMenusRef = useRef<ContextMenusContext | null>(null);
  const [expandedThreadParents, setExpandedThreadParents] = useState<
    Set<string>
  >(new Set());
  const isSinglePanel = layoutMode === "single-panel";

  // 统计未读数
  const groupUnread = useMemo(
    () =>
      channels.reduce(
        (sum: number, c: ChannelPickerItem) => sum + (c.muted ? 0 : c.unread),
        0
      ),
    [channels]
  );
  const privateUnread = useMemo(
    () =>
      privateChats.reduce(
        (sum: number, c: ChannelPickerItem) => sum + (c.muted ? 0 : c.unread),
        0
      ),
    [privateChats]
  );

  // 搜索过滤
  const lowerQuery = query.trim().toLowerCase();

  const filteredChannels = useMemo(() => {
    if (!lowerQuery) return channels;
    return channels.filter((c) => c.name.toLowerCase().includes(lowerQuery));
  }, [channels, lowerQuery]);

  const filteredPrivateChats = useMemo(() => {
    if (!lowerQuery) return privateChats;
    return privateChats.filter((c) =>
      c.name.toLowerCase().includes(lowerQuery)
    );
  }, [privateChats, lowerQuery]);

  const filteredAllItems = useMemo(() => {
    if (!lowerQuery) return [];
    return [...filteredChannels, ...filteredPrivateChats];
  }, [filteredChannels, filteredPrivateChats, lowerQuery]);

  // 按分类组织频道 + 子区
  const categoryTree = useMemo(() => {
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

    // 从 channels 中分离出子区和普通频道
    const threads = filteredChannels.filter(
      (c) => c.channelType === 5 && c.parentChannelId
    );
    const normalChannels = filteredChannels.filter(
      (c) => c.channelType !== 5 || !c.parentChannelId
    );

    // 子区按父频道分组
    const threadsByParent = new Map<string, ChannelPickerItem[]>();
    for (const t of threads) {
      const list = threadsByParent.get(t.parentChannelId!) || [];
      list.push(t);
      threadsByParent.set(t.parentChannelId!, list);
    }

    // 找到默认分类（如果有），未分类频道归入其中
    const defaultCategory = sortedCategories.find(
      (c) => c.isDefault || c.id.startsWith("default-")
    );

    // 按分类分组
    const channelsByCategory = new Map<string, ChannelPickerItem[]>();
    const uncategorized: ChannelPickerItem[] = [];

    for (const ch of normalChannels) {
      if (ch.categoryId) {
        const list = channelsByCategory.get(ch.categoryId) || [];
        list.push(ch);
        channelsByCategory.set(ch.categoryId, list);
      } else if (defaultCategory) {
        // 归入默认分类，避免 "未分类" 重复显示
        const list = channelsByCategory.get(defaultCategory.id) || [];
        list.push(ch);
        channelsByCategory.set(defaultCategory.id, list);
      } else {
        uncategorized.push(ch);
      }
    }

    return {
      sortedCategories,
      channelsByCategory,
      uncategorized,
      threadsByParent,
    };
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

  const openContextMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    menus: ContextMenusData[]
  ) => {
    if (menus.length === 0) {
      return;
    }

    flushSync(() => {
      setContextMenus(menus);
    });
    contextMenusRef.current?.show(event);
  };

  const handleItemContextMenu =
    (item: ChannelPickerItem) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const menus = getItemContextMenus?.(item) ?? [];
      if (menus.length === 0) {
        return;
      }
      openContextMenu(event, menus);
    };

  const handleCategoryContextMenu =
    (category: NonNullable<ChannelPickerProps["categories"]>[number]) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const menus = getCategoryContextMenus?.(category) ?? [];
      if (menus.length === 0) {
        return;
      }
      openContextMenu(event, menus);
    };

  const renderChannelWithThreads = (ch: ChannelPickerItem) => {
    const threads = categoryTree.threadsByParent.get(ch.channelId) || [];
    const isExpanded = expandedThreadParents.has(ch.channelId);
    const MAX_VISIBLE = 2;
    const visibleThreads = isExpanded ? threads : threads.slice(0, MAX_VISIBLE);
    const hiddenCount = threads.length - visibleThreads.length;
    const hiddenThreads = isExpanded ? [] : threads.slice(MAX_VISIBLE);
    const hiddenMentionCount = hiddenThreads.reduce(
      (sum: number, t: ChannelPickerItem) => sum + t.mentionCount,
      0
    );

    return (
      <React.Fragment key={ch.channelId}>
        <ChannelItem
          item={ch}
          isSelected={ch.channelId === selectedId}
          level={0}
          onClick={() => onSelect(ch)}
          onContextMenu={handleItemContextMenu(ch)}
        />
        {visibleThreads.map((t) => (
          <ChannelItem
            key={t.channelId}
            item={t}
            isSelected={t.channelId === selectedId}
            level={1}
            onClick={() => onSelect(t)}
            onContextMenu={handleItemContextMenu(t)}
          />
        ))}
        {hiddenCount > 0 && (
          <button
            className={`wk-channel-picker-more-subs${
              hiddenMentionCount > 0 ? " has-mention" : ""
            }`}
            onClick={() => toggleThreadExpand(ch.channelId)}
          >
            + {hiddenCount} 个子区
            {hiddenMentionCount > 0 && (
              <span className="wk-channel-picker-row-mention">
                @{hiddenMentionCount}
              </span>
            )}
          </button>
        )}
        {isExpanded && threads.length > MAX_VISIBLE && (
          <button
            className="wk-channel-picker-more-subs"
            onClick={() => toggleThreadExpand(ch.channelId)}
          >
            收起子区
          </button>
        )}
      </React.Fragment>
    );
  };

  const renderGroupList = (showEmptyState: boolean) => {
    const { sortedCategories, channelsByCategory, uncategorized } =
      categoryTree;

    if (filteredChannels.length === 0) {
      return showEmptyState ? (
        <div className="wk-channel-picker-empty">未找到频道</div>
      ) : null;
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
                onContextMenu={handleCategoryContextMenu(cat)}
              >
                <span className="wk-channel-picker-cat-arrow">
                  {isCollapsed ? "▸" : "▾"}
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
              <div className="wk-channel-picker-cat-static">默认分组</div>
            )}
            {uncategorized.map((ch) => renderChannelWithThreads(ch))}
          </div>
        )}
      </>
    );
  };

  const renderPrivateList = (showEmptyState: boolean) => {
    if (filteredPrivateChats.length === 0) {
      return showEmptyState ? (
        <div className="wk-channel-picker-empty">未找到联系人</div>
      ) : null;
    }

    return filteredPrivateChats.map((item) => (
      <ChannelItem
        key={item.channelId}
        item={item}
        isSelected={item.channelId === selectedId}
        isPrivate
        onClick={() => onSelect(item)}
        onContextMenu={handleItemContextMenu(item)}
      />
    ));
  };

  const renderSinglePanelList = () => {
    if (lowerQuery) {
      if (filteredAllItems.length === 0) {
        return <div className="wk-channel-picker-empty">未找到会话</div>;
      }

      return filteredAllItems.map((item) => (
        <ChannelItem
          key={`${item.channelType}:${item.channelId}`}
          item={item}
          isSelected={item.channelId === selectedId}
          isPrivate={item.channelType === 1}
          onClick={() => onSelect(item)}
          onContextMenu={handleItemContextMenu(item)}
        />
      ));
    }

    const hasGroups = filteredChannels.length > 0;
    const hasPrivateChats = filteredPrivateChats.length > 0;

    if (!hasGroups && !hasPrivateChats) {
      return <div className="wk-channel-picker-empty">暂无可选会话</div>;
    }

    return (
      <>
        {hasGroups && renderGroupList(false)}
        {hasPrivateChats && (
          <>
            <div className="wk-channel-picker-cat-static">私聊</div>
            {renderPrivateList(false)}
          </>
        )}
      </>
    );
  };

  return (
    <div
      className={`wk-channel-picker${
        isSinglePanel ? " wk-channel-picker--single-panel" : ""
      }`}
    >
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
      {!isSinglePanel && (
        <div className="wk-channel-picker-tabs">
          <button
            className={`wk-channel-picker-tab${
              activeTab === "group" ? " is-active" : ""
            }`}
            onClick={() => setActiveTab("group")}
          >
            群聊
            {groupUnread > 0 && (
              <span className="wk-channel-picker-tab-badge">
                {groupUnread > 99 ? "99+" : groupUnread}
              </span>
            )}
          </button>
          <button
            className={`wk-channel-picker-tab${
              activeTab === "private" ? " is-active" : ""
            }`}
            onClick={() => setActiveTab("private")}
          >
            私聊
            {privateUnread > 0 && (
              <span className="wk-channel-picker-tab-badge">
                {privateUnread > 99 ? "99+" : privateUnread}
              </span>
            )}
          </button>
        </div>
      )}

      {/* 列表区 */}
      <div className="wk-channel-picker-list">
        {loading ? (
          <div className="wk-channel-picker-loading">加载中…</div>
        ) : isSinglePanel ? (
          renderSinglePanelList()
        ) : activeTab === "group" ? (
          renderGroupList(true)
        ) : (
          renderPrivateList(true)
        )}
      </div>

      <ContextMenus
        onContext={(ctx) => {
          contextMenusRef.current = ctx;
        }}
        menus={contextMenus}
      />
    </div>
  );
}
