import React, { Component } from 'react';
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
import './index.css';

interface SidepanelLayoutState {
  selectedChannel: Channel | null;
  selectedChannelName: string;
  showPicker: boolean;
  channels: ChannelPickerItem[];
  categories: ChannelPickerCategory[];
  privateChats: ChannelPickerItem[];
  pickerLoading: boolean;
}

export default class SidepanelLayout extends Component<{}, SidepanelLayoutState> {
  private conversationContext?: ConversationContext;
  private conversationListenerRemover?: () => void;
  private channelInfoListenerRemover?: () => void;
  private loadDebounceTimer?: ReturnType<typeof setTimeout>;

  constructor(props: {}) {
    super(props);
    this.state = {
      selectedChannel: null,
      selectedChannelName: '',
      showPicker: false,
      channels: [],
      categories: [],
      privateChats: [],
      pickerLoading: false,
    };
  }

  componentDidMount() {
    // 初始化 Space（和 MainPage 一样）
    this.initSpace().then(async () => {
      // 主动同步会话列表（和 Chat 页面一样），否则 conversations 是空的
      await WKSDK.shared().conversationManager.sync({});
      // 同步完成后加载频道数据
      this.loadChannelPickerData();
    });

    // 监听会话列表变化——始终刷新缓存，不管 picker 是否展开
    const conversationListener = () => {
      this.scheduleLoad();
    };
    WKSDK.shared().conversationManager.addConversationListener(conversationListener);
    this.conversationListenerRemover = () => {
      WKSDK.shared().conversationManager.removeConversationListener(conversationListener);
    };

    // 监听频道信息变化
    const channelInfoListener = (channelInfo: ChannelInfo) => {
      const { selectedChannel } = this.state;
      if (selectedChannel && channelInfo.channel.isEqual(selectedChannel)) {
        this.setState({
          selectedChannelName: channelInfo.orgData?.displayName || channelInfo.title || '',
        });
      }
      // 刷新 picker 数据
      this.scheduleLoad();
    };
    WKSDK.shared().channelManager.addListener(channelInfoListener);
    this.channelInfoListenerRemover = () => {
      WKSDK.shared().channelManager.removeListener(channelInfoListener);
    };

    // 注册 showConversation endpoint，拦截导航
    WKApp.endpointManager.setMethod(
      'showConversation',
      (param: any) => {
        const channel = param.channel as Channel;
        this.selectChannel(channel);
      },
      {},
    );
  }

  componentWillUnmount() {
    this.conversationListenerRemover?.();
    this.channelInfoListenerRemover?.();
    if (this.loadDebounceTimer) clearTimeout(this.loadDebounceTimer);
  }

  /** debounce 300ms 防止 SDK 事件频繁触发重复加载 */
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

      // 加载分类
      let categoryItems: CategoryItem[] = [];
      const spaceId = WKApp.shared.currentSpaceId;
      if (spaceId) {
        try {
          categoryItems = await CategoryService.list(spaceId);
        } catch (e) {
          console.warn('[SidepanelLayout] Failed to load categories:', e);
        }
      }

      // 转换分类
      const categories: ChannelPickerCategory[] = categoryItems.map((cat, idx) => ({
        id: cat.category_id || `default-${idx}`,
        name: cat.name,
        order: cat.sort,
      }));

      // 构建 groupNo → categoryId 的映射
      const groupCategoryMap = new Map<string, string>();
      for (const cat of categoryItems) {
        const catId = cat.category_id || `default-${categoryItems.indexOf(cat)}`;
        for (const group of cat.groups) {
          groupCategoryMap.set(group.group_no, catId);
        }
      }

      // 转换频道列表
      const channelList: ChannelPickerItem[] = [];
      const privateChatList: ChannelPickerItem[] = [];

      for (const conv of conversations) {
        // Space 过滤
        if (shouldSkipChannelForSpace(conv.channel)) continue;
        if (shouldSkipPersonConversationForSpace(conv)) continue;

        const channelInfo = WKSDK.shared().channelManager.getChannelInfo(conv.channel);
        const name = channelInfo?.orgData?.displayName || channelInfo?.title || conv.channel.channelID;
        const muted = channelInfo?.mute ?? false;

        // 计算未读数
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

        // 获取提醒数
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
    } catch (e) {
      console.warn('[SidepanelLayout] Failed to load picker data:', e);
      this.setState({ pickerLoading: false });
    }
  }

  private handlePickerToggle = () => {
    if (this.state.showPicker) {
      this.setState({ showPicker: false });
    } else {
      this.setState({ showPicker: true });
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

  private handleRefresh = () => {
    this.loadChannelPickerData();
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
    // 私聊：显示头像
    return (
      <img
        className="wk-sidepanel-header-avatar"
        alt=""
        src={WKApp.shared.avatarChannel(channel)}
      />
    );
  }

  render() {
    const { selectedChannel, selectedChannelName, showPicker } = this.state;

    // 箭头方向：picker 展开时向上，否则向下
    const arrowPath = showPicker ? 'M3 7l3-3 3 3' : 'M3 5l3 3 3-3';

    return (
      <div className="wk-sidepanel-layout">
        {/* Header */}
        <div className="wk-sidepanel-header" onClick={this.handlePickerToggle}>
          {selectedChannel ? (
            <>
              <button className="wk-sidepanel-header-toggle" title="切换频道">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d={arrowPath} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {this.getChannelIcon(selectedChannel)}
              <span className="wk-sidepanel-header-name">{selectedChannelName}</span>
            </>
          ) : (
            <>
              <div className="wk-sidepanel-header-logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                </svg>
              </div>
              <span className="wk-sidepanel-header-name">Octo</span>
              <button className="wk-sidepanel-header-toggle" title="选择频道">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d={arrowPath} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="wk-sidepanel-content">
          {showPicker ? (
            <div className="wk-sidepanel-picker-wrap">
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
          ) : selectedChannel ? (
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
        </div>
      </div>
    );
  }
}
