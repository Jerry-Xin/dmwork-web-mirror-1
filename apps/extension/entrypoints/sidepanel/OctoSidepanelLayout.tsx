import React, { Component } from 'react';
import '@dmwork/base/src/Components/SidepanelLayout/index.css';
import {
  Channel,
  ChannelTypeGroup,
  ChannelTypePerson,
  WKSDK,
  ChannelInfo,
} from 'wukongimjssdk';
import {
  ChannelTypeCommunityTopic,
  EndpointID,
  GroupRole,
} from '@dmwork/base/src/Service/Const';
import { Conversation } from '@dmwork/base/src/Components/Conversation';
import ChannelPicker from '@dmwork/base/src/Components/ChannelPicker';
import type {
  ChannelPickerItem,
  ChannelPickerCategory,
} from '@dmwork/base/src/Components/ChannelPicker';
import CategoryService, { type CategoryItem } from '@dmwork/base/src/Service/CategoryService';
import {
  WKApp,
  shouldSkipChannelForSpace,
  shouldSkipPersonConversationForSpace,
} from '@dmwork/base';
import HashIcon from '@dmwork/base/src/Components/Icons/HashIcon';
import ThreadIcon from '@dmwork/base/src/Components/Icons/ThreadIcon';
import { showToast } from './OctoToast';
import type ConversationContext from '@dmwork/base/src/Components/Conversation/context';
import type { MessageInputContext } from '@dmwork/base/src/Components/MessageInput';
import { ErrorBoundary } from '@dmwork/base/src/Components/ErrorBoundary';
import { ChannelSettingManager } from '@dmwork/base/src/Service/ChannelSetting';
import { SpaceService } from '@dmwork/base/src/Service/SpaceService';
import CreateCategoryModal from '@dmwork/base/src/Components/CreateCategoryModal';


const HashIconComponent = HashIcon as any;
const ThreadIconComponent = ThreadIcon as any;
const ConversationComponent = Conversation as any;
const ErrorBoundaryComponent = ErrorBoundary as any;

interface DrawerMember {
  uid: string;
  name: string;
  remark?: string;
  role?: number;
  status?: number;
  orgData?: Record<string, any>;
}

interface OctoSidepanelLayoutState {
  selectedChannel: Channel | null;
  selectedChannelName: string;
  showPicker: boolean;
  showInfoDrawer: boolean;
  channels: ChannelPickerItem[];
  categories: ChannelPickerCategory[];
  privateChats: ChannelPickerItem[];
  pickerLoading: boolean;
  pinnedIds: Set<string>;
  memberLoading: boolean;
  members: DrawerMember[];
  showAiMembers: boolean;
  showHumanMembers: boolean;
  drawerMuted: boolean | null;
  theme: string;
  layout: string;
  showSettings: boolean;
  // Full Composer
  showFullComposer: boolean;
  fullComposerText: string;
  // Lightbox
  lightboxSrc: string | null;
  // Search Popover
  showSearch: boolean;
  searchQuery: string;
  searchTab: 'contacts' | 'groups' | 'files';
  searchResults: any[];
  // Contacts Drawer
  showContacts: boolean;
  // Create Menu (rail)
  showCreateMenu: boolean;
  // Create Category Modal
  showCreateCategoryModal: boolean;
}

function getFirstChar(name: string): string {
  if (!name) return '?';
  const ch = name.charAt(0);
  if (/[a-zA-Z0-9]/.test(ch)) return ch.toUpperCase();
  return ch;
}

function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1},65%,55%), hsl(${h2},65%,45%))`;
}

function renderDrawerIcon(name: 'close' | 'star' | 'bellOff' | 'edit' | 'trash' | 'logout' | 'caret'): React.ReactNode {
  switch (name) {
    case 'close':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.5l2.7 5.47 6.03.88-4.36 4.25 1.03 6-5.4-2.84-5.4 2.84 1.03-6L3.27 9.85l6.03-.88L12 3.5z" />
        </svg>
      );
    case 'bellOff':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.35 5.41A2 2 0 0 1 12 4a2 2 0 0 1 2 2v.29a7 7 0 0 1 4 6.3V16l1.5 2H6.12" />
          <path d="M9 18a3 3 0 0 0 5.12 1.96" />
          <path d="M3 3l18 18" />
        </svg>
      );
    case 'edit':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      );
    case 'trash':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
        </svg>
      );
    case 'logout':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case 'caret':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    default:
      return null;
  }
}

export default class OctoSidepanelLayout extends Component<{}, OctoSidepanelLayoutState> {
  private conversationContext?: ConversationContext;
  private conversationListenerRemover?: () => void;
  private channelInfoListenerRemover?: () => void;
  private loadDebounceTimer?: ReturnType<typeof setTimeout>;
  private spinnerTimer?: ReturnType<typeof setInterval>;
  private spinnerVerbIndex = 0;

  private SPINNER_VERBS = [
    '思考', '推理', '梳理', '分析', '检索', '归纳', '斟酌', '对齐', '琢磨',
    '审视', '审阅', '解析', '推演', '打磨', '提炼', '整理', '研读', '构思',
    '拟定', '沉浸', '咀嚼', '推敲', '整合', '抽丝剥茧',
    '揣摩', '复盘', '盘算', '铺开', '梳头绪', '穿针引线',
  ];

  constructor(props: {}) {
    super(props);

    const savedPins = localStorage.getItem('octo_sidepanel_pinned');
    let pinnedIds = new Set<string>();
    if (savedPins) {
      try { pinnedIds = new Set(JSON.parse(savedPins)); } catch {}
    }

    this.state = {
      selectedChannel: null,
      selectedChannelName: '',
      showPicker: false,
      showInfoDrawer: false,
      channels: [],
      categories: [],
      privateChats: [],
      pickerLoading: false,
      pinnedIds,
      memberLoading: false,
      members: [],
      showAiMembers: true,
      showHumanMembers: true,
      drawerMuted: null,
      theme: 'paper',
      layout: 'message',
      showSettings: false,
      // Full Composer
      showFullComposer: false,
      fullComposerText: '',
      // Lightbox
      lightboxSrc: null,
      // Search Popover
      showSearch: false,
      searchQuery: '',
      searchTab: 'contacts',
      searchResults: [],
      // Contacts Drawer
      showContacts: false,
      // Create Menu (rail)
      showCreateMenu: false,
      // Create Category Modal
      showCreateCategoryModal: false,
    };
  }

  componentDidMount() {
    const theme = localStorage.getItem('octo_v3_theme') || 'paper';
    const layout = localStorage.getItem('octo_v3_layout') || 'message';
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-layout', layout);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-layout', layout);
    this.setState({ theme, layout });

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

    document.addEventListener('keydown', this.handleEscKey);
    document.addEventListener('click', this.handleClickOutsideSettings);
    document.addEventListener('click', this.handleImageClick);
  }

  componentWillUnmount() {
    this.conversationListenerRemover?.();
    this.channelInfoListenerRemover?.();
    if (this.loadDebounceTimer) clearTimeout(this.loadDebounceTimer);
    if (this.spinnerTimer) clearInterval(this.spinnerTimer);
    document.removeEventListener('keydown', this.handleEscKey);
    document.removeEventListener('click', this.handleClickOutsideSettings);
    document.removeEventListener('click', this.handleImageClick);
  }

  private handleEscKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    // Close overlays in z-index priority order (highest first)
    if (this.state.lightboxSrc) {
      this.setState({ lightboxSrc: null });
      return;
    }
    if (this.state.showFullComposer) {
      this.setState({ showFullComposer: false });
      return;
    }
    if (this.state.showSearch) {
      this.setState({ showSearch: false });
      return;
    }
    if (this.state.showSettings) {
      this.setState({ showSettings: false });
      return;
    }
    if (this.state.showCreateMenu) {
      this.setState({ showCreateMenu: false });
      return;
    }
    if (this.state.showContacts) {
      this.setState({ showContacts: false });
      return;
    }
    if (this.state.showInfoDrawer) {
      this.setState({ showInfoDrawer: false });
      return;
    }
    if (this.state.showPicker) {
      this.setState({ showPicker: false });
    }
  };

  private startSpinner() {
    if (this.spinnerTimer) return;
    this.spinnerVerbIndex = Math.floor(Math.random() * this.SPINNER_VERBS.length);
    this.spinnerTimer = setInterval(() => {
      this.spinnerVerbIndex = (this.spinnerVerbIndex + 1) % this.SPINNER_VERBS.length;
      const el = document.querySelector('.octo-sidepanel-v3 .verb') as HTMLElement | null;
      if (el) {
        el.style.opacity = '0';
        setTimeout(() => {
          el.textContent = `Agent 正在 ${this.SPINNER_VERBS[this.spinnerVerbIndex]}…`;
          el.style.opacity = '1';
        }, 150);
      }
    }, 1500);
  }

  private stopSpinner() {
    if (this.spinnerTimer) {
      clearInterval(this.spinnerTimer);
      this.spinnerTimer = undefined;
    }
  }

  private renderSpinner() {
    const verb = this.SPINNER_VERBS[this.spinnerVerbIndex % this.SPINNER_VERBS.length];
    return (
      <div className="spinner-row">
        <span className="dotz" />
        <span className="verb">Agent 正在 {verb}…</span>
      </div>
    );
  }

  private handleImageClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Intercept clicks on images inside conversation messages for lightbox
    if (
      target.tagName === 'IMG' &&
      target.closest('.wk-sidepanel-content') &&
      !target.closest('.wk-sidepanel-header-avatar') &&
      !target.closest('.octo-lightbox')
    ) {
      const src = (target as HTMLImageElement).src;
      if (src) {
        e.preventDefault();
        e.stopPropagation();
        this.openLightbox(src);
      }
    }
  };

  private handleClickOutsideSettings = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Close settings popover
    if (this.state.showSettings) {
      if (!target.closest('.octo-settings-pop') && !target.closest('.wk-rail-action-settings')) {
        this.setState({ showSettings: false });
      }
    }
    // Close create menu
    if (this.state.showCreateMenu) {
      if (!target.closest('.wk-rail-create-menu') && !target.closest('.wk-rail-action-create')) {
        this.setState({ showCreateMenu: false });
      }
    }
  };

  private setTheme = (theme: string) => {
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('octo_v3_theme', theme);
    this.setState({ theme });
  };

  private setLayout = (layout: string) => {
    document.body.setAttribute('data-layout', layout);
    document.documentElement.setAttribute('data-layout', layout);
    localStorage.setItem('octo_v3_layout', layout);
    this.setState({ layout });
  };

  private toggleSettings = () => {
    this.setState((prev) => ({ showSettings: !prev.showSettings, showCreateMenu: false }));
  };

  private toggleCreateMenu = () => {
    this.setState((prev) => ({ showCreateMenu: !prev.showCreateMenu, showSettings: false }));
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
      console.warn('[OctoSidepanelLayout] Failed to init space:', e);
    }
  }

  private async fetchMembers(channel: Channel) {
    if (channel.channelType === ChannelTypePerson) {
      this.setState({ members: [], memberLoading: false });
      return;
    }

    this.setState({ memberLoading: true });
    try {
      const data = await WKApp.dataSource.channelDataSource.subscribers(channel, {
        page: 1,
        limit: 1000,
      });
      const members = (data || []).map((member: any) => ({
        uid: member.uid,
        name: member.name,
        remark: member.remark,
        role: member.role,
        status: member.status,
        orgData: member.orgData,
      }));
      this.setState({ members, memberLoading: false });
    } catch (e) {
      console.warn('[OctoSidepanelLayout] Failed to load members:', e);
      this.setState({ members: [], memberLoading: false });
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
      showInfoDrawer: false,
      members: [],
      drawerMuted: null,
    });

    if (channel.channelType !== ChannelTypePerson) {
      void this.fetchMembers(channel);
    }
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
          console.warn('[OctoSidepanelLayout] Failed to load categories:', e);
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
            WKSDK.shared().channelManager.fetchChannelInfo(ch).catch(() => null),
          ),
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

      if (!this.state.selectedChannel && (channelList.length > 0 || privateChatList.length > 0)) {
        const allItems = [...channelList, ...privateChatList];
        const firstItem = allItems[0];
        if (firstItem) {
          const channel = new Channel(firstItem.channelId, firstItem.channelType);
          this.selectChannel(channel);
        }
      }
    } catch (e) {
      console.warn('[OctoSidepanelLayout] Failed to load picker data:', e);
      this.setState({ pickerLoading: false });
    }
  }

  private handlePickerToggle = async () => {
    if (this.state.showPicker) {
      this.setState({ showPicker: false });
      return;
    }
    this.setState({ showPicker: true, pickerLoading: true, showInfoDrawer: false });
    await WKSDK.shared().conversationManager.sync({});
    this.loadChannelPickerData();
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
    const { selectedChannel } = this.state;
    if (selectedChannel && selectedChannel.channelType !== ChannelTypePerson) {
      await this.fetchMembers(selectedChannel);
    }
    this.loadChannelPickerData();
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

  private handleInfoDrawerToggle = async () => {
    const { selectedChannel, showInfoDrawer } = this.state;
    if (!selectedChannel) return;
    if (showInfoDrawer) {
      this.setState({ showInfoDrawer: false });
      return;
    }
    this.setState({ showInfoDrawer: true });
    await this.fetchMembers(selectedChannel);
  };

  private confirmAction(content: string, onOk: () => void | Promise<void>) {
    const baseContext = WKApp.shared.baseContext as any;
    if (baseContext?.showAlert) {
      baseContext.showAlert({
        content,
        onOk,
      });
      return;
    }
    if (window.confirm(content)) {
      void onOk();
    }
  }

  private isAiMember(member: DrawerMember) {
    const text = `${member.name || ''} ${member.uid || ''}`.toLowerCase();
    return member.orgData?.robot === 1 || /ai|agent|bot|thomas|claude|龙虾/.test(text);
  }

  private getDisplayName(member: DrawerMember) {
    return member.remark || member.name || member.uid;
  }

  private getMemberSubtitle(member: DrawerMember) {
    if (this.isAiMember(member)) {
      const scope =
        member.orgData?.scope ||
        member.orgData?.bot_scope ||
        member.orgData?.robot_name ||
        member.orgData?.bot_name;
      return scope ? `${scope} · 已接入` : 'AI 伙伴 · 已接入';
    }
    const title = member.orgData?.title || member.orgData?.position || member.orgData?.dept;
    if (member.role === GroupRole.owner) {
      return title ? `${title} · 群主` : '群主';
    }
    if (member.role === GroupRole.manager) {
      return title ? `${title} · 管理员` : '管理员';
    }
    return title || '成员';
  }

  private getMemberToneClass(member: DrawerMember) {
    if (this.isAiMember(member)) return 'is-ai';
    const seed = this.getDisplayName(member) || member.uid;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const tones = ['is-teal', 'is-amber', 'is-coral', ''];
    return tones[Math.abs(hash) % tones.length];
  }

  private getDrawerMemberGroups() {
    const aiMembers = this.state.members.filter((member) => this.isAiMember(member));
    const humanMembers = this.state.members
      .filter((member) => !this.isAiMember(member))
      .sort((a, b) => {
        const orderA = a.role === GroupRole.owner ? 0 : a.role === GroupRole.manager ? 1 : 2;
        const orderB = b.role === GroupRole.owner ? 0 : b.role === GroupRole.manager ? 1 : 2;
        if (orderA !== orderB) return orderA - orderB;
        return this.getDisplayName(a).localeCompare(this.getDisplayName(b), 'zh-Hans-CN');
      });

    return { aiMembers, humanMembers };
  }

  private toggleDrawerGroup = (key: 'showAiMembers' | 'showHumanMembers') => {
    this.setState((prev) => ({ [key]: !prev[key] } as Pick<OctoSidepanelLayoutState, typeof key>));
  };

  private handleMuteToggle = async () => {
    const { selectedChannel, drawerMuted } = this.state;
    if (!selectedChannel) return;
    const currentMuted = drawerMuted ?? Boolean(WKSDK.shared().channelManager.getChannelInfo(selectedChannel)?.mute);
    const nextMuted = !currentMuted;
    this.setState({ drawerMuted: nextMuted });
    try {
      await ChannelSettingManager.shared.mute(nextMuted, selectedChannel);
      await WKSDK.shared().channelManager.fetchChannelInfo(selectedChannel).catch(() => null);
      this.scheduleLoad();
    } catch (e) {
      console.warn('[OctoSidepanelLayout] Failed to update mute:', e);
      this.setState({ drawerMuted: currentMuted });
    }
  };

  private handleRenameGroup = async () => {
    const { selectedChannel, selectedChannelName } = this.state;
    if (!selectedChannel || selectedChannel.channelType === ChannelTypePerson) return;
    const nextName = window.prompt('输入新的群聊名称', selectedChannelName || '');
    const trimmed = nextName?.trim();
    if (!trimmed || trimmed === selectedChannelName) return;
    try {
      await WKApp.dataSource.channelDataSource.updateField(selectedChannel, 'name', trimmed);
      await WKSDK.shared().channelManager.fetchChannelInfo(selectedChannel).catch(() => null);
      this.setState({ selectedChannelName: trimmed });
      this.loadChannelPickerData();
    } catch (e) {
      console.warn('[OctoSidepanelLayout] Failed to rename group:', e);
    }
  };

  private handleClearMessages = async () => {
    const { selectedChannel } = this.state;
    if (!selectedChannel) return;
    this.confirmAction('是否清空此会话的所有消息？', async () => {
      const conversation = WKSDK.shared().conversationManager.findConversation(selectedChannel);
      if (!conversation) return;
      await WKApp.conversationProvider.clearConversationMessages(conversation);
      conversation.lastMessage = undefined;
      WKApp.endpointManager.invoke(EndpointID.clearChannelMessages, selectedChannel);
    });
  };

  private handleLeaveChannel = async () => {
    const { selectedChannel } = this.state;
    if (!selectedChannel || selectedChannel.channelType === ChannelTypePerson) return;
    this.confirmAction('退出后不会通知群里其他成员，且不会再接收此群聊消息', async () => {
      await WKApp.dataSource.channelDataSource.exitChannel(selectedChannel).catch((e) => {
        console.warn('[OctoSidepanelLayout] Failed to leave channel:', e);
      });
      await WKApp.conversationProvider.deleteConversation(selectedChannel).catch(() => null);
      this.setState({
        selectedChannel: null,
        selectedChannelName: '',
        showInfoDrawer: false,
        members: [],
      });
      await WKSDK.shared().conversationManager.sync({});
      await this.loadChannelPickerData();
    });
  };

  // ================================================================
  // Full Composer
  // ================================================================

  private toggleFullComposer = () => {
    this.setState((prev) => ({
      showFullComposer: !prev.showFullComposer,
      fullComposerText: prev.showFullComposer ? '' : prev.fullComposerText,
    }));
  };

  private submitFullComposer = () => {
    const { fullComposerText, selectedChannel } = this.state;
    const trimmed = fullComposerText.trim();
    if (!trimmed || !selectedChannel) return;

    // Send via the conversation context if available
    if (this.conversationContext) {
      const inputCtx = (this.conversationContext as any).messageInputContext as MessageInputContext | undefined;
      if (inputCtx && typeof inputCtx.send === 'function') {
        inputCtx.send(trimmed);
      }
    }

    this.setState({ showFullComposer: false, fullComposerText: '' });
  };

  private handleFullComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      this.submitFullComposer();
    }
  };

  private renderFullComposer() {
    if (!this.state.showFullComposer) return null;
    return (
      <div className="octo-fullcomp">
        <div className="octo-fullcomp-header">
          <span className="octo-fullcomp-title">全屏编辑</span>
          <button className="octo-fullcomp-close" onClick={this.toggleFullComposer} type="button">×</button>
        </div>
        <div className="octo-fullcomp-body">
          <textarea
            className="octo-fullcomp-textarea"
            value={this.state.fullComposerText}
            onChange={(e) => this.setState({ fullComposerText: e.target.value })}
            onKeyDown={this.handleFullComposerKeyDown}
            placeholder="输入消息…"
            autoFocus
          />
        </div>
        <div className="octo-fullcomp-foot">
          <span className="octo-fullcomp-hint">⌘↵ 发送 · Esc 收起</span>
          <button className="octo-fullcomp-send" onClick={this.submitFullComposer} type="button">发送</button>
        </div>
      </div>
    );
  }

  // ================================================================
  // Lightbox
  // ================================================================

  private openLightbox = (src: string) => {
    this.setState({ lightboxSrc: src });
  };

  private closeLightbox = () => {
    this.setState({ lightboxSrc: null });
  };

  private handleLightboxClick = (e: React.MouseEvent) => {
    // Close when clicking the backdrop (not the image)
    if ((e.target as HTMLElement).classList.contains('octo-lightbox')) {
      this.closeLightbox();
    }
  };

  private renderLightbox() {
    const { lightboxSrc } = this.state;
    if (!lightboxSrc) return null;
    return (
      <div className="octo-lightbox" onClick={this.handleLightboxClick}>
        <img src={lightboxSrc} alt="" />
        <button className="octo-lightbox-close" onClick={this.closeLightbox} type="button">×</button>
      </div>
    );
  }

  // ================================================================
  // Search Popover
  // ================================================================

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;

  private handleSearchToggle = () => {
    this.setState((prev) => ({
      showSearch: !prev.showSearch,
      searchQuery: '',
      searchTab: 'contacts' as const,
      searchResults: [],
    }));
  };

  private handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    this.setState({ searchQuery: query });
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    if (!query.trim()) {
      this.setState({ searchResults: [] });
      return;
    }
    this.searchDebounceTimer = setTimeout(() => {
      void this.doSearch(query.trim(), this.state.searchTab);
    }, 300);
  };

  private handleSearchTabChange = (tab: 'contacts' | 'groups' | 'files') => {
    this.setState({ searchTab: tab, searchResults: [] });
    const { searchQuery } = this.state;
    if (searchQuery.trim()) {
      void this.doSearch(searchQuery.trim(), tab);
    }
  };

  private async doSearch(keyword: string, tab: 'contacts' | 'groups' | 'files') {
    try {
      // Map tab to content_type array (matches web client format)
      // contacts/groups: empty array = search all; files: [8] = file type only
      const contentTypeMap: Record<string, number[]> = { contacts: [], groups: [], files: [8] };
      const contentTypes = contentTypeMap[tab] ?? [];
      const spaceId = WKApp.shared.currentSpaceId;
      const searchUrl = spaceId
        ? `/search/global?space_id=${encodeURIComponent(spaceId)}`
        : '/search/global';
      const res = await WKApp.apiClient.post(searchUrl, {
        keyword,
        content_type: contentTypes,
        page: 1,
        limit: 20,
      });
      // Normalize results from API response (fields match web client: friends, groups, messages)
      const results: any[] = [];
      if (tab === 'contacts' && res?.friends) {
        for (const c of res.friends) {
          results.push({ id: c.uid || c.id, name: c.channel_name || c.name || c.uid, sub: c.channel_remark || c.remark || '' });
        }
      }
      if (tab === 'groups' && res?.groups) {
        for (const g of res.groups) {
          results.push({ id: g.group_no || g.id, name: g.channel_name || g.name, sub: `${g.member_count || ''} 人` });
        }
      }
      if (tab === 'files' && res?.messages) {
        for (const m of res.messages) {
          results.push({ id: m.message_id || m.id, name: m.from_name || m.sender_name || '文件', sub: m.payload?.content?.substring(0, 40) || '' });
        }
      }
      // Fallback: if current tab has no results but other fields exist, try to extract from any available data
      if (results.length === 0) {
        if (res?.friends) {
          for (const c of res.friends) {
            results.push({ id: c.uid || c.id, name: c.channel_name || c.name || c.uid, sub: c.channel_remark || c.remark || '' });
          }
        }
        if (res?.groups) {
          for (const g of res.groups) {
            results.push({ id: g.group_no || g.id, name: g.channel_name || g.name, sub: `${g.member_count || ''} 人` });
          }
        }
        if (res?.messages) {
          for (const m of res.messages) {
            results.push({ id: m.message_id || m.id, name: m.from_name || m.sender_name || '消息', sub: m.payload?.content?.substring(0, 40) || '' });
          }
        }
      }
      this.setState({ searchResults: results });
    } catch (e) {
      console.warn('[OctoSidepanelLayout] Search failed:', e);
      this.setState({ searchResults: [] });
    }
  }

  private renderSearchPopover() {
    if (!this.state.showSearch) return null;
    const { searchQuery, searchTab, searchResults } = this.state;
    const tabs: { key: 'contacts' | 'groups' | 'files'; label: string }[] = [
      { key: 'contacts', label: '联系人' },
      { key: 'groups', label: '群组' },
      { key: 'files', label: '文件' },
    ];
    return (
      <div className="octo-search-pop">
        <input
          className="octo-search-input"
          placeholder="搜索联系人、群组、文件…"
          value={searchQuery}
          onChange={this.handleSearchInput}
          autoFocus
        />
        <div className="octo-search-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`octo-search-tab${searchTab === tab.key ? ' is-active' : ''}`}
              onClick={() => this.handleSearchTabChange(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="octo-search-results">
          {searchQuery.trim() === '' ? (
            <div className="octo-search-empty">输入关键词开始搜索</div>
          ) : searchResults.length === 0 ? (
            <div className="octo-search-empty">无匹配结果</div>
          ) : (
            searchResults.map((item: any) => (
              <div key={item.id} className="octo-search-result-item">
                <span
                  className="octo-search-result-avatar"
                  style={{ background: avatarGradient(item.name) }}
                >
                  {getFirstChar(item.name)}
                </span>
                <span>
                  <div className="octo-search-result-name">{item.name}</div>
                  <div className="octo-search-result-sub">{item.sub}</div>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ================================================================
  // Contacts Drawer
  // ================================================================

  private contactsList: Array<{ id: string; name: string; sub: string; robot?: boolean }> = [];
  private contactsLoaded = false;

  private toggleContacts = () => {
    const nextShow = !this.state.showContacts;
    this.setState({ showContacts: nextShow });
    if (nextShow && !this.contactsLoaded) {
      void this.loadContacts();
    }
  };

  private async loadContacts() {
    try {
      const results = await WKApp.apiClient.get('friend/sync', {
        param: { version: '', api_version: '1' },
      });
      if (Array.isArray(results)) {
        this.contactsList = results.map((r: any) => ({
          id: r.uid || r.id || '',
          name: r.remark || r.name || r.uid || '',
          sub: r.robot === 1 ? 'AI 伙伴 · 已接入' : '',
          robot: r.robot === 1,
        }));
      }
      this.contactsLoaded = true;
      this.forceUpdate();
    } catch (e) {
      console.warn('[OctoSidepanelLayout] Failed to load contacts:', e);
    }
  }

  private getGroupedContacts() {
    const aiPartners = this.contactsList.filter((c) => c.robot);
    const friends = this.contactsList.filter((c) => !c.robot);

    // Group by first letter
    const grouped: Record<string, typeof friends> = {};
    for (const f of friends) {
      const ch = getFirstChar(f.name);
      const letter = /[A-Z]/.test(ch) ? ch : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(f);
    }

    return { aiPartners, grouped, letters: Object.keys(grouped).sort() };
  }

  private renderContactsDrawer() {
    const { showContacts } = this.state;
    const { aiPartners, grouped, letters } = this.getGroupedContacts();

    return (
      <div className={`octo-contacts-drawer${showContacts ? ' is-open' : ''}`}>
        <div className="octo-contacts-header">
          <span className="octo-contacts-title">通讯录</span>
          <button className="octo-contacts-close" onClick={this.toggleContacts} type="button">×</button>
        </div>
        <div className="octo-contacts-body">
          {!this.contactsLoaded && (
            <div className="octo-contacts-section">加载中…</div>
          )}

          {/* AI 伙伴 */}
          {aiPartners.length > 0 && (
            <>
              <div className="octo-contacts-section">AI 伙伴</div>
              {aiPartners.map((f) => (
                <div key={f.id} className="octo-contacts-item">
                  <span
                    className="octo-contacts-avatar"
                    style={{ background: 'var(--octo-avatar-ai)' }}
                  >
                    {getFirstChar(f.name)}
                  </span>
                  <span>
                    <div className="octo-contacts-name">{f.name}</div>
                    <div className="octo-contacts-sub">{f.sub}</div>
                  </span>
                </div>
              ))}
            </>
          )}

          {/* 我的朋友 A-Z */}
          {letters.length > 0 && (
            <div className="octo-contacts-section">我的朋友</div>
          )}
          {letters.map((letter) => (
            <React.Fragment key={letter}>
              <div className="octo-contacts-section" id={`contacts-letter-${letter}`}>{letter}</div>
              {grouped[letter].map((f) => (
                <div key={f.id} className="octo-contacts-item">
                  <span className="octo-contacts-avatar" style={{ background: avatarGradient(f.name) }}>
                    {getFirstChar(f.name)}
                  </span>
                  <span>
                    <div className="octo-contacts-name">{f.name}</div>
                    <div className="octo-contacts-sub">{f.sub}</div>
                  </span>
                </div>
              ))}
            </React.Fragment>
          ))}

          {this.contactsLoaded && this.contactsList.length === 0 && (
            <div className="octo-contacts-section">暂无联系人</div>
          )}

          {/* 右侧字母索引条 */}
          {letters.length > 0 && (
            <div className="octo-contacts-index">
              {letters.map((letter) => (
                <span
                  key={letter}
                  className="octo-contacts-index-letter"
                  onClick={() => {
                    const el = document.getElementById(`contacts-letter-${letter}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {letter}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  private renderMemberGroup(
    title: string,
    members: DrawerMember[],
    expanded: boolean,
    onToggle: () => void,
  ) {
    return (
      <div className={`octo-sidepanel-mem-group${expanded ? ' is-open' : ''}`}>
        <button className="octo-sidepanel-mem-head" onClick={onToggle} type="button">
          <span className="octo-sidepanel-mem-caret">{renderDrawerIcon('caret')}</span>
          <span className="octo-sidepanel-mem-label">{title}</span>
          <span className="octo-sidepanel-mem-count">{members.length}</span>
        </button>
        {expanded && (
          <div className="octo-sidepanel-mem-body">
            {members.map((member, index) => {
              const isAi = this.isAiMember(member);
              const isOwner = member.role === GroupRole.owner;
              return (
                <div key={`${member.uid}-${index}`} className="octo-sidepanel-mem-row">
                  <span
                    className={`octo-sidepanel-mem-avatar ${this.getMemberToneClass(member)}`}
                  >
                    {getFirstChar(this.getDisplayName(member) || member.uid)}
                  </span>
                  <span className="octo-sidepanel-mem-text">
                    <span className="octo-sidepanel-mem-name">
                      {this.getDisplayName(member)}
                      {isAi && <span className="octo-sidepanel-mem-badge octo-sidepanel-mem-badge-ai">AGENT</span>}
                      {isOwner && <span className="octo-sidepanel-mem-badge octo-sidepanel-mem-badge-owner">OWNER</span>}
                    </span>
                    <span className="octo-sidepanel-mem-role">{this.getMemberSubtitle(member)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  private getChannelIcon(channel: Channel) {
    if (channel.channelType === ChannelTypeGroup) {
      return (
        <span className="wk-sidepanel-header-icon">
          <HashIconComponent size={16} />
        </span>
      );
    }
    if (channel.channelType === ChannelTypeCommunityTopic) {
      return (
        <span className="wk-sidepanel-header-icon">
          <ThreadIconComponent size={16} color="currentColor" />
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
      (t) => !pinnedIds.has(t.channelId) && ((t.unread > 0 && !t.muted) || t.mentionCount > 0),
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
                <span className={item.muted ? 'wk-sidepanel-rail-badge wk-sidepanel-rail-badge-muted' : 'wk-sidepanel-rail-badge'}>
                  {item.unread > 99 ? '99+' : item.unread}
                </span>
              )}
              {isPinned && <span className="wk-sidepanel-rail-pin" />}
            </button>
          );
        })}

        {hiddenCount > 0 && (
          <button
            className="wk-sidepanel-rail-more"
            title={`查看其他 ${hiddenCount} 个会话`}
            onClick={this.handlePickerToggle}
          >
            +{hiddenCount}
          </button>
        )}

        <div className="wk-sidepanel-rail-spacer" />
        <div className="wk-sidepanel-rail-divider" />

        {/* Rail action buttons */}
        <button
          className={`wk-rail-action wk-rail-action-contacts${this.state.showContacts ? ' is-active' : ''}`}
          title="通讯录"
          onClick={this.toggleContacts}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="wk-rail-action-wrap">
          <button
            className={`wk-rail-action wk-rail-action-create${this.state.showCreateMenu ? ' is-active' : ''}`}
            title="创建"
            onClick={this.toggleCreateMenu}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {this.state.showCreateMenu && (
            <div className="wk-rail-create-menu">
              {/* 发起私聊 */}
              <button
                className="wk-rail-create-menu-item"
                onClick={() => {
                  this.setState({ showCreateMenu: false });
                  const baseContext = WKApp.shared.baseContext as any;
                  if (baseContext?.showConversationSelect) {
                    baseContext.showConversationSelect((channels: Channel[]) => {
                      if (channels?.length > 0) {
                        WKApp.endpoints.showConversation(channels[0]);
                      }
                    }, '找人聊天');
                  } else {
                    showToast('发起私聊 · 环境未就绪，请稍后重试');
                  }
                }}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span>发起私聊</span>
              </button>
              {/* 创建群聊 */}
              <button
                className="wk-rail-create-menu-item"
                onClick={() => {
                  this.setState({ showCreateMenu: false });
                  try {
                    WKApp.endpoints.organizationalLayer(null);
                  } catch {
                    // organizationalLayer endpoint 可能未注册（ContactsModule 尚未初始化）
                    showToast('创建群聊 · 环境未就绪，请稍后重试');
                  }
                }}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>创建群聊</span>
              </button>
              {/* 创建分组 */}
              <button
                className="wk-rail-create-menu-item"
                onClick={() => { this.setState({ showCreateMenu: false, showCreateCategoryModal: true }); }}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span>创建分组</span>
              </button>
            </div>
          )}
        </div>

        <div className="wk-rail-action-wrap">
          <button
            className={`wk-rail-action wk-rail-action-settings${this.state.showSettings ? ' is-active' : ''}`}
            title="设置"
            onClick={this.toggleSettings}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {this.state.showSettings && (
            <div className="octo-settings-pop is-open wk-rail-settings-pop">
              <div className="octo-settings-section">主题</div>
              <div className="octo-settings-seg">
                {[{id:'paper',label:'Paper'},{id:'terminal',label:'Terminal'},{id:'moonwire',label:'Moonwire'}].map(t => (
                  <button key={t.id} className={`octo-settings-seg-btn${this.state.theme===t.id?' is-active':''}`} onClick={() => this.setTheme(t.id)}>
                    <span className="octo-settings-seg-dot" data-theme={t.id} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
    );
  }

  private renderInfoDrawer() {
    const {
      selectedChannel,
      selectedChannelName,
      pinnedIds,
      showInfoDrawer,
      members,
      memberLoading,
      showAiMembers,
      showHumanMembers,
      drawerMuted,
    } = this.state;
    if (!selectedChannel) return null;

    const isPrivate = selectedChannel.channelType === ChannelTypePerson;
    const channelInfo = WKSDK.shared().channelManager.getChannelInfo(selectedChannel);
    const pinned = pinnedIds.has(selectedChannel.channelID);
    const muted = drawerMuted ?? Boolean(channelInfo?.mute);
    const { aiMembers, humanMembers } = this.getDrawerMemberGroups();
    const metaText = isPrivate
      ? '私聊会话'
      : [
          `${members.length || '—'} 人`,
          aiMembers.length > 0 ? `${aiMembers.length} AI` : '',
          selectedChannel.channelType === ChannelTypeCommunityTopic ? 'Thread' : '群聊',
        ].filter(Boolean).join(' · ');

    return (
      <div className={`octo-sidepanel-drawer${showInfoDrawer ? ' is-open' : ''}`}>
        <div className="octo-sidepanel-drawer-head">
          <div className="octo-sidepanel-drawer-title">{isPrivate ? '会话信息' : '群信息'}</div>
          <button
            className="octo-sidepanel-drawer-close"
            onClick={() => this.setState({ showInfoDrawer: false })}
            type="button"
          >
            {renderDrawerIcon('close')}
          </button>
        </div>

        <div className="octo-sidepanel-drawer-body">
          <div className="octo-sidepanel-gi-hero">
            <div className="octo-sidepanel-gi-avatar">
              {getFirstChar(selectedChannelName || selectedChannel.channelID)}
            </div>
            <div className="octo-sidepanel-gi-body">
              <div className="octo-sidepanel-gi-name">
                {selectedChannelName}
                {!isPrivate && (
                  <span className="octo-sidepanel-gi-channel">
                    {selectedChannel.channelType === ChannelTypeCommunityTopic ? 'Thread' : '# 讨论'}
                  </span>
                )}
              </div>
              <div className="octo-sidepanel-gi-meta">
                {channelInfo?.orgData?.category || metaText}
              </div>
            </div>
          </div>

          <div className="octo-sidepanel-gi-section">会话设置</div>

          <button
            className={`octo-sidepanel-gi-toggle${pinned ? ' is-on' : ''}`}
            onClick={() => this.togglePin(selectedChannel.channelID)}
            type="button"
          >
            <span className="octo-sidepanel-gi-toggle-icon">{renderDrawerIcon('star')}</span>
            <span className="octo-sidepanel-gi-toggle-label">置顶在 Rail</span>
            <span className="octo-sidepanel-gi-switch" />
          </button>

          <button
            className={`octo-sidepanel-gi-toggle${muted ? ' is-on' : ''}`}
            onClick={() => { void this.handleMuteToggle(); }}
            type="button"
          >
            <span className="octo-sidepanel-gi-toggle-icon">{renderDrawerIcon('bellOff')}</span>
            <span className="octo-sidepanel-gi-toggle-label">消息免打扰</span>
            <span className="octo-sidepanel-gi-switch" />
          </button>

          {!isPrivate && (
            <>
              {memberLoading && <div className="octo-sidepanel-mem-empty">加载成员中…</div>}
              {!memberLoading && aiMembers.length > 0 && this.renderMemberGroup(
                'AI 伙伴',
                aiMembers,
                showAiMembers,
                () => this.toggleDrawerGroup('showAiMembers'),
              )}
              {!memberLoading && this.renderMemberGroup(
                '成员',
                humanMembers,
                showHumanMembers,
                () => this.toggleDrawerGroup('showHumanMembers'),
              )}
              {!memberLoading && members.length === 0 && (
                <div className="octo-sidepanel-mem-empty">暂无成员数据</div>
              )}

              <div className="octo-sidepanel-gi-section">操作</div>
              <button
                className="octo-sidepanel-gi-action"
                onClick={() => { void this.handleRenameGroup(); }}
                type="button"
              >
                <span className="octo-sidepanel-gi-toggle-icon">{renderDrawerIcon('edit')}</span>
                <span className="octo-sidepanel-gi-toggle-label">重命名群聊</span>
              </button>
              <button
                className="octo-sidepanel-gi-action"
                onClick={() => { void this.handleClearMessages(); }}
                type="button"
              >
                <span className="octo-sidepanel-gi-toggle-icon">{renderDrawerIcon('trash')}</span>
                <span className="octo-sidepanel-gi-toggle-label">清空聊天记录</span>
              </button>
              <button
                className="octo-sidepanel-gi-action is-danger"
                onClick={() => { void this.handleLeaveChannel(); }}
                type="button"
              >
                <span className="octo-sidepanel-gi-toggle-icon">{renderDrawerIcon('logout')}</span>
                <span className="octo-sidepanel-gi-toggle-label">退出该群聊</span>
              </button>
            </>
          )}

          {isPrivate && (
            <>
              <div className="octo-sidepanel-gi-section">操作</div>
              <button
                className="octo-sidepanel-gi-action"
                onClick={() => { void this.handleClearMessages(); }}
                type="button"
              >
                <span className="octo-sidepanel-gi-toggle-icon">{renderDrawerIcon('trash')}</span>
                <span className="octo-sidepanel-gi-toggle-label">清空聊天记录</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  render() {
    const { selectedChannel, selectedChannelName, showPicker, members, memberLoading } = this.state;
    const isPrivate = selectedChannel?.channelType === ChannelTypePerson;
    const memberCountText = memberLoading ? '...' : String(Math.max(members.length, 0));

    return (
      <div className="octo-sidepanel-shell">
        <div className="octo-sidepanel-app">
        <div className="wk-sidepanel-layout">
        <div className="wk-sidepanel-body">
          {this.renderRail()}

          <div className="wk-sidepanel-main">
            <header className="wk-sidepanel-header">
              <button
                className="wk-sidepanel-header-toggle"
                title="切换频道"
                onClick={this.handlePickerToggle}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 9l6 6 6-6"
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
              <div className="wk-sidepanel-header-actions">
                <button
                  className="wk-sidepanel-header-search"
                  title="搜索"
                  onClick={this.handleSearchToggle}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="11"
                      cy="11"
                      r="6.5"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M16 16L21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                {/* 通讯录、设置已移至 Rail 底部；全屏编辑、三个点菜单按钮暂时隐藏 */}
                {selectedChannel && (
                  <button
                    className="wk-sidepanel-header-peer"
                    title={isPrivate ? '会话信息' : '查看群信息'}
                    onClick={this.handleInfoDrawerToggle}
                  >
                    {isPrivate ? (
                      <span>私聊</span>
                    ) : (
                      <span>
                        共 <b>{memberCountText}</b> 人
                      </span>
                    )}
                  </button>
                )}
              </div>
            </header>

            {/* Settings Popover moved to Rail */}

            <div className="wk-sidepanel-content">
              {selectedChannel ? (
                <ErrorBoundaryComponent moduleName="会话">
                  <ConversationComponent
                    key={selectedChannel.getChannelKey()}
                    channel={selectedChannel}
                    onContext={(ctx: ConversationContext & { messageInputContext?: MessageInputContext }) => {
                      this.conversationContext = ctx;
                    }}
                  />
                </ErrorBoundaryComponent>
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

            {/* Search Popover — positioned inside main, below header */}
            {this.renderSearchPopover()}

            {/* Full Composer — covers entire main area */}
            {this.renderFullComposer()}

            {this.renderInfoDrawer()}
          </div>

          {/* Contacts Drawer — covers main area but not Rail */}
          {this.renderContactsDrawer()}
        </div>
      </div>
      </div>

      {/* Lightbox — fixed, top-level overlay */}
      {this.renderLightbox()}

      {/* Create Category Modal */}
      <CreateCategoryModal
        visible={this.state.showCreateCategoryModal}
        existingNames={this.state.categories.map(c => c.name)}
        onConfirm={async (name: string) => {
          const spaceId = WKApp.shared.currentSpaceId;
          if (!spaceId) {
            showToast('未选中 Space，无法创建分组');
            return;
          }
          await CategoryService.create(spaceId, { name });
          this.setState({ showCreateCategoryModal: false });
          // 刷新侧栏分组列表
          this.loadChannelPickerData();
        }}
        onCancel={() => this.setState({ showCreateCategoryModal: false })}
      />
      </div>
    );
  }
}
