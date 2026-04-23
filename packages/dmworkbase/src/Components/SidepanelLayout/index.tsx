import React, { Component, createRef } from 'react';
import {
  Channel,
  ChannelTypeGroup,
  ChannelTypePerson,
  WKSDK,
  ChannelInfo,
} from 'wukongimjssdk';
import { ChannelTypeCommunityTopic } from '../../Service/Const';
import WKApp from '../../App';
import { Conversation } from '../Conversation';
import ChannelPicker from '../ChannelPicker';
import type { ChannelPickerItem, ChannelPickerCategory } from '../ChannelPicker';
import CategoryService, { type CategoryItem } from '../../Service/CategoryService';
import { shouldSkipChannelForSpace, shouldSkipPersonConversationForSpace } from '../../Service/SpaceService';
import HashIcon from '../Icons/HashIcon';
import ThreadIcon from '../Icons/ThreadIcon';
import ConversationContext from '../Conversation/context';
import { ErrorBoundary } from '../ErrorBoundary';
import { SpaceService } from '../../Service/SpaceService';
import { avatarGradient, getFirstChar } from '../../Utils/avatar';
import './index.css';

interface SidepanelLayoutState {
  selectedChannel: Channel | null;
  selectedChannelName: string;
  showPicker: boolean;
  showMoreMenu: boolean;
  channels: ChannelPickerItem[];
  categories: ChannelPickerCategory[];
  privateChats: ChannelPickerItem[];
  pickerLoading: boolean;
  pinnedIds: Set<string>;
}

export default class SidepanelLayout extends Component<{}, SidepanelLayoutState> {
  private conversationContext?: ConversationContext;
  private conversationListenerRemover?: () => void;
  private channelInfoListenerRemover?: () => void;
  private loadDebounceTimer?: ReturnType<typeof setTimeout>;
  private moreMenuRef = createRef<HTMLDivElement>();
  private moreBtnRef = createRef<HTMLButtonElement>();

  constructor(props: {}) {
    super(props);

    const savedPins = localStorage.getItem('octo_sidepanel_pinned');
    let pinnedIds = new Set<string>();
    if (savedPins) {
      try { pinnedIds = new Set(JSON.parse(savedPins)); } catch (err) {
        console.debug('[SidepanelLayout] Failed to parse pinned ids:', err);
      }
    }

    this.state = {
      selectedChannel: null,
      selectedChannelName: '',
      showPicker: false,
      showMoreMenu: false,
      channels: [],
      categories: [],
      privateChats: [],
      pickerLoading: false,
      pinnedIds,
    };
  }

  componentDidMount() {
    this.initSpace().then(async () => {
      await WKSDK.shared().conversationManager.sync({});
      this.loadChannelPickerData();
    });

    const conversationListener = () => {
      this.scheduleLoad();
    };
    WKSDK.shared().conversationManager.addConversationListener(conversationListener);
    this.conversationListenerRemover = () => {
      WKSDK.shared().conversationManager.removeConversationListener(conversationListener);
    };

    const channelInfoListener = (channelInfo: ChannelInfo) => {
      const { selectedChannel } = this.state;
      if (selectedChannel && channelInfo.channel.isEqual(selectedChannel)) {
        this.setState({
          selectedChannelName: channelInfo.orgData?.displayName || channelInfo.title || '',
        });
      }
      this.scheduleLoad();
    };
    WKSDK.shared().channelManager.addListener(channelInfoListener);
    this.channelInfoListenerRemover = () => {
      WKSDK.shared().channelManager.removeListener(channelInfoListener);
    };

    WKApp.endpointManager.setMethod(
      'showConversation',
      (param: any) => {
        const channel = param.channel as Channel;
        this.selectChannel(channel);
      },
      {},
    );

    document.addEventListener('mousedown', this.handleOutsideClick);
    document.addEventListener('keydown', this.handleEscKey);
  }

  componentWillUnmount() {
    this.conversationListenerRemover?.();
    this.channelInfoListenerRemover?.();
    if (this.loadDebounceTimer) clearTimeout(this.loadDebounceTimer);
    document.removeEventListener('mousedown', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleEscKey);
  }

  private handleOutsideClick = (e: MouseEvent) => {
    if (
      this.state.showMoreMenu &&
      this.moreMenuRef.current &&
      !this.moreMenuRef.current.contains(e.target as Node) &&
      this.moreBtnRef.current &&
      !this.moreBtnRef.current.contains(e.target as Node)
    ) {
      this.setState({ showMoreMenu: false });
    }
  };

  private handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (this.state.showMoreMenu) {
        this.setState({ showMoreMenu: false });
      } else if (this.state.showPicker) {
        this.setState({ showPicker: false });
      }
    }
  };

  private scheduleLoad() {
    if (this.loadDebounceTimer) clearTimeout(this.loadDebounceTimer);
    this.loadDebounceTimer = setTimeout(() => {
      this.loadChannelPickerData();
    }, 300);
  }

  private async initSpace() {
    try {
      const spaces = await SpaceService.shared.getMySpaces();
      const savedSpaceId = localStorage.getItem('currentSpaceId');
      if (savedSpaceId && spaces.find((s) => s.space_id === savedSpaceId)) {
        WKApp.shared.currentSpaceId = savedSpaceId;
      } else if (spaces.length > 0) {
        WKApp.shared.currentSpaceId = spaces[0].space_id;
        localStorage.setItem('currentSpaceId', spaces[0].space_id);
      }
    } catch (e) {
      console.warn('[SidepanelLayout] Failed to init space:', e);
    }
  }

  private selectChannel(channel: Channel) {
    WKApp.shared.openChannel = channel;
    const channelInfo = WKSDK.shared().channelManager.getChannelInfo(channel);
    const name = channelInfo?.orgData?.displayName || channelInfo?.title || channel.channelID;

    if (!channelInfo) {
      WKSDK.shared().channelManager.fetchChannelInfo(channel);
    }

    this.setState({
      selectedChannel: channel,
      selectedChannelName: name,
      showPicker: false,
    });
  }

  private async loadChannelPickerData() {
    this.setState({ pickerLoading: true });

    try {
      const conversations = WKSDK.shared().conversationManager.conversations;

      let categoryItems: CategoryItem[] = [];
      const spaceId = WKApp.shared.currentSpaceId;
      if (spaceId) {
        try {
          categoryItems = await CategoryService.list(spaceId);
        } catch (e) {
          console.warn('[SidepanelLayout] Failed to load categories:', e);
        }
      }

      const categories: ChannelPickerCategory[] = categoryItems.map((cat, idx) => ({
        id: cat.category_id || `default-${idx}`,
        name: cat.name === '未分类' ? '默认分组' : cat.name,
        order: cat.sort,
      }));

      const groupCategoryMap = new Map<string, string>();
      for (const cat of categoryItems) {
        const catId = cat.category_id || `default-${categoryItems.indexOf(cat)}`;
        for (const group of cat.groups) {
          groupCategoryMap.set(group.group_no, catId);
        }
      }

      const uncachedChannels = conversations
        .filter((conv) => !WKSDK.shared().channelManager.getChannelInfo(conv.channel))
        .map((conv) => conv.channel);
      if (uncachedChannels.length > 0) {
        await Promise.all(
          uncachedChannels.map((ch) =>
            WKSDK.shared().channelManager.fetchChannelInfo(ch).catch(() => null)
          )
        );
      }

      const channelList: ChannelPickerItem[] = [];
      const privateChatList: ChannelPickerItem[] = [];

      for (const conv of conversations) {
        if (shouldSkipChannelForSpace(conv.channel)) continue;
        if (shouldSkipPersonConversationForSpace(conv)) continue;

        const channelInfo = WKSDK.shared().channelManager.getChannelInfo(conv.channel);
        const name = channelInfo?.orgData?.displayName || channelInfo?.title || conv.channel.channelID;
        const muted = channelInfo?.mute ?? false;

        let unread = 0;
        if (
          spaceId &&
          conv.channel.channelType === ChannelTypePerson &&
          conv.extra?.spaceUnread !== undefined
        ) {
          unread = Math.max(0, Number(conv.extra.spaceUnread || 0));
        } else {
          unread = Math.max(0, Number(conv.unread || 0));
        }

        const mentionCount = conv.reminders?.filter((r) => !r.done).length ?? 0;

        const item: ChannelPickerItem = {
          channelId: conv.channel.channelID,
          channelType: conv.channel.channelType,
          name,
          unread,
          mentionCount,
          muted,
          lastMessageTime: conv.lastMessage?.timestamp ?? 0,
          categoryId: groupCategoryMap.get(conv.channel.channelID),
          parentChannelId: channelInfo?.orgData?.parentGroupNo,
        };

        if (conv.channel.channelType === ChannelTypePerson) {
          privateChatList.push(item);
        } else {
          channelList.push(item);
        }
      }

      this.setState({
        channels: channelList,
        categories,
        privateChats: privateChatList,
        pickerLoading: false,
      });

      // 自动选中第一个对话
      if (!this.state.selectedChannel && (channelList.length > 0 || privateChatList.length > 0)) {
        const allItems = [...channelList, ...privateChatList];
        const firstItem = allItems[0];
        if (firstItem) {
          const channel = new Channel(firstItem.channelId, firstItem.channelType);
          this.selectChannel(channel);
        }
      }
    } catch (e) {
      console.warn('[SidepanelLayout] Failed to load picker data:', e);
      this.setState({ pickerLoading: false });
    }
  }

  private handlePickerToggle = async () => {
    if (this.state.showPicker) {
      this.setState({ showPicker: false });
    } else {
      this.setState({ showPicker: true, pickerLoading: true });
      await WKSDK.shared().conversationManager.sync({});
      this.loadChannelPickerData();
    }
  };

  private handlePickerClose = () => {
    this.setState({ showPicker: false });
  };

  private handleChannelSelect = (item: ChannelPickerItem) => {
    const channel = new Channel(item.channelId, item.channelType);
    this.selectChannel(channel);
  };

  private handleRefresh = async () => {
    await WKSDK.shared().conversationManager.sync({});
    this.loadChannelPickerData();
  };

  private handleMoreMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    this.setState((prev) => ({ showMoreMenu: !prev.showMoreMenu }));
  };

  private togglePin = (channelId: string) => {
    this.setState((prev) => {
      const next = new Set(prev.pinnedIds);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      localStorage.setItem('octo_sidepanel_pinned', JSON.stringify([...next]));
      return { pinnedIds: next };
    });
  };

  private getChannelIcon(channel: Channel) {
    if (channel.channelType === ChannelTypeGroup) {
      return (
        <span className="wk-sidepanel-header-icon">
          <HashIcon size={16} />
        </span>
      );
    }
    if (channel.channelType === ChannelTypeCommunityTopic) {
      return (
        <span className="wk-sidepanel-header-icon">
          <ThreadIcon size={16} color="currentColor" />
        </span>
      );
    }
    return (
      <img
        className="wk-sidepanel-header-avatar"
        alt=""
        src={WKApp.shared.avatarChannel(channel)}
      />
    );
  }

  private getRailItems(): { visible: ChannelPickerItem[]; hiddenCount: number } {
    const { channels, privateChats, pinnedIds } = this.state;
    const all = [...channels, ...privateChats];

    const pinned = all.filter((t) => pinnedIds.has(t.channelId));
    const unpinnedActive = all.filter(
      (t) => !pinnedIds.has(t.channelId) && ((t.unread > 0 && !t.muted) || t.mentionCount > 0)
    );
    const visible = [...pinned, ...unpinnedActive];
    const hiddenCount = all.length - visible.length;

    return { visible, hiddenCount };
  }

  private renderRail() {
    const { selectedChannel, pinnedIds } = this.state;
    const { visible, hiddenCount } = this.getRailItems();
    const currentId = selectedChannel?.channelID;

    return (
      <nav className="wk-sidepanel-rail">
        {visible.map((item) => {
          const isCurrent = item.channelId === currentId;
          const isPinned = pinnedIds.has(item.channelId);
          const isPrivate = item.channelType === ChannelTypePerson;
          const hasMention = item.mentionCount > 0;
          const hasUnread = item.unread > 0 && !hasMention;

          const cls = [
            'wk-sidepanel-rail-item',
            isCurrent && 'is-current',
            isPinned && 'is-pinned',
            !isPinned && (hasUnread || hasMention) && 'is-unread-only',
            hasMention && 'is-mention',
            item.muted && 'is-muted',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={item.channelId}
              className={cls}
              title={item.name}
              onClick={() => {
                if (item.channelId === currentId) return;
                const channel = new Channel(item.channelId, item.channelType);
                this.selectChannel(channel);
              }}
            >
              {hasMention ? (
                <span className="wk-sidepanel-rail-icon wk-sidepanel-rail-icon-mention">@</span>
              ) : isPrivate ? (
                <span
                  className="wk-sidepanel-rail-icon wk-sidepanel-rail-icon-pm"
                  style={{ background: avatarGradient(item.name) }}
                >
                  {getFirstChar(item.name)}
                </span>
              ) : (
                <span className="wk-sidepanel-rail-icon">{getFirstChar(item.name)}</span>
              )}
              {!hasMention && hasUnread && (
                <span className={item.muted ? 'wk-sidepanel-rail-badge wk-sidepanel-rail-badge-muted' : 'wk-sidepanel-rail-badge'} />
              )}
              {isPinned && <span className="wk-sidepanel-rail-pin" />}
            </button>
          );
        })}

        {hiddenCount > 0 && (
          <button
            className="wk-sidepanel-rail-more"
            title={`查看其他 ${hiddenCount} 个会话`}
            onClick={() => this.setState({ showPicker: true })}
          >
            +{hiddenCount}
          </button>
        )}

        <div className="wk-sidepanel-rail-spacer" />
        <div className="wk-sidepanel-rail-divider" />
      </nav>
    );
  }

  private renderMoreMenu() {
    if (!this.state.showMoreMenu) return null;

    const { selectedChannel, pinnedIds } = this.state;
    const currentPinned = selectedChannel ? pinnedIds.has(selectedChannel.channelID) : false;

    return (
      <div className="wk-sidepanel-more-menu" ref={this.moreMenuRef}>
        {selectedChannel && (
          <button
            className="wk-sidepanel-more-item"
            onClick={() => {
              this.togglePin(selectedChannel.channelID);
              this.setState({ showMoreMenu: false });
            }}
          >
            <span className="wk-sidepanel-more-icon">{currentPinned ? '📌' : '📍'}</span>
            <span className="wk-sidepanel-more-label">{currentPinned ? '取消固定' : '固定到侧栏'}</span>
          </button>
        )}
        <button
          className="wk-sidepanel-more-item"
          onClick={() => {
            this.handleRefresh();
            this.setState({ showMoreMenu: false });
          }}
        >
          <span className="wk-sidepanel-more-icon">↻</span>
          <span className="wk-sidepanel-more-label">刷新</span>
        </button>
        <div className="wk-sidepanel-more-divider" />
        <button
          className="wk-sidepanel-more-item"
          onClick={() => {
            try { (globalThis as any).chrome?.runtime?.openOptionsPage?.(); } catch (err) {
              console.debug('[SidepanelLayout] openOptionsPage failed:', err);
            }
            this.setState({ showMoreMenu: false });
          }}
        >
          <span className="wk-sidepanel-more-icon">⚙</span>
          <span className="wk-sidepanel-more-label">打开设置</span>
        </button>
      </div>
    );
  }

  render() {
    const { selectedChannel, selectedChannelName, showPicker } = this.state;
    const arrowPath = showPicker ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6';

    return (
      <div className="wk-sidepanel-layout">
        <div className="wk-sidepanel-body">
          {this.renderRail()}

          <div className="wk-sidepanel-main">
            {/* Header */}
            <header className="wk-sidepanel-header">
              <button
                className="wk-sidepanel-header-toggle"
                title="切换频道"
                onClick={this.handlePickerToggle}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d={arrowPath}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {selectedChannel ? (
                <>
                  {this.getChannelIcon(selectedChannel)}
                  <div className="wk-sidepanel-header-title">
                    <span className="wk-sidepanel-header-name">{selectedChannelName}</span>
                  </div>
                </>
              ) : (
                <div className="wk-sidepanel-header-title">
                  <span className="wk-sidepanel-header-name">Octo</span>
                </div>
              )}
              <button
                ref={this.moreBtnRef}
                className="wk-sidepanel-header-more"
                title="更多"
                onClick={this.handleMoreMenuToggle}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="5" cy="12" r="1.6" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                  <circle cx="19" cy="12" r="1.6" fill="currentColor" />
                </svg>
              </button>
              {this.renderMoreMenu()}
            </header>

            {/* Content */}
            <div className="wk-sidepanel-content">
              {selectedChannel ? (
                <ErrorBoundary moduleName="会话">
                  <Conversation
                    key={selectedChannel.getChannelKey()}
                    channel={selectedChannel}
                    onContext={(ctx) => {
                      this.conversationContext = ctx;
                    }}
                  />
                </ErrorBoundary>
              ) : (
                <div className="wk-sidepanel-empty">
                  <div className="wk-sidepanel-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <rect x="4" y="8" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
                      <path d="M4 16h40" stroke="currentColor" strokeWidth="2" />
                      <circle cx="10" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="20" cy="12" r="1.5" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="wk-sidepanel-empty-text">选择一个频道开始对话</p>
                  <button className="wk-sidepanel-empty-btn" onClick={this.handlePickerToggle}>
                    选择频道
                  </button>
                </div>
              )}

              {/* Picker Overlay */}
              {showPicker && (
                <div className="wk-sidepanel-picker-overlay">
                  <div className="wk-sidepanel-picker-card">
                    <ChannelPicker
                      channels={this.state.channels}
                      categories={this.state.categories}
                      privateChats={this.state.privateChats}
                      selectedId={selectedChannel?.channelID}
                      onSelect={this.handleChannelSelect}
                      onClose={this.handlePickerClose}
                      onRefresh={this.handleRefresh}
                      loading={this.state.pickerLoading}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
