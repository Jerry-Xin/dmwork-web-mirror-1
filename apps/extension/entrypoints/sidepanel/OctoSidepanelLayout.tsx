import React, { Component } from "react";
import "@dmwork/base/src/Components/SidepanelLayout/index.css";
import {
  Channel,
  ChannelTypeGroup,
  ChannelTypePerson,
  WKSDK,
  ChannelInfo,
} from "wukongimjssdk";
import {
  ChannelTypeCommunityTopic,
  EndpointID,
  GroupRole,
} from "@dmwork/base/src/Service/Const";
import { Conversation } from "@dmwork/base/src/Components/Conversation";
import ChatConversationList from "@dmwork/base/src/Components/ChatConversationList";
import type { ConvFilter } from "@dmwork/base/src/Components/ConversationList";
import { ConversationWrap } from "@dmwork/base/src/Service/Model";
import CategoryService from "@dmwork/base/src/Service/CategoryService";
import {
  WKApp,
  shouldSkipChannelForSpace,
  shouldSkipPersonConversationForSpace,
} from "@dmwork/base";
import HashIcon from "@dmwork/base/src/Components/Icons/GroupIcon";
import ThreadIcon from "@dmwork/base/src/Components/Icons/ThreadIcon";
import { showToast } from "./OctoToast";
import OctoComposer from "./OctoComposer";
import OctoLightbox from "./OctoLightbox";
import OctoSpaceSwitcherPopover from "./OctoSpaceSwitcherPopover";
import OctoSearchPopover from "./OctoSearchPopover";
import OctoContactsDrawer from "./OctoContactsDrawer";
import OctoInfoDrawer from "./OctoInfoDrawer";
import { renderDrawerIcon } from "./OctoDrawerIcons";
import type ConversationContext from "@dmwork/base/src/Components/Conversation/context";
import type { MessageInputContext } from "@dmwork/base/src/Components/MessageInput";
import { ErrorBoundary } from "@dmwork/base/src/Components/ErrorBoundary";
import { ChannelSettingManager } from "@dmwork/base/src/Service/ChannelSetting";
import {
  SpaceService,
  type SpaceMember,
  type Space,
} from "@dmwork/base/src/Service/SpaceService";
import CreateCategoryModal from "@dmwork/base/src/Components/CreateCategoryModal";
import {
  setExtensionSidepanelSelectedConversation,
  setExtensionTheme,
} from "../../utils/extensionStorage";
import { getTitleColor } from "@dmwork/base/src/Utils/titleColor";
import {
  avatarGradient,
  getFirstChar,
} from "@dmwork/base/src/Utils/avatar";

const HashIconComponent = HashIcon as any;
const ThreadIconComponent = ThreadIcon as any;
const ConversationComponent = Conversation as any;
const ErrorBoundaryComponent = ErrorBoundary as any;
const CreateCategoryModalComponent = CreateCategoryModal as any;
const ChatConversationListComponent = ChatConversationList as any;

interface DrawerMember {
  uid: string;
  name: string;
  remark?: string;
  role?: number;
  status?: number;
  orgData?: Record<string, any>;
}

interface RailItem {
  channelId: string;
  channelType: number;
  name: string;
  unread: number;
  mentionCount: number;
  muted: boolean;
}

interface OctoSidepanelLayoutState {
  selectedChannel: Channel | null;
  selectedChannelName: string;
  showPicker: boolean;
  showInfoDrawer: boolean;
  pickerFilter: ConvFilter;
  conversationsVersion: number;
  categoryNames: string[];
  pinnedIds: Set<string>;
  memberLoading: boolean;
  members: DrawerMember[];
  theme: string;
  layout: string;
  readingMode: "message" | "cli";
  showSettings: boolean;
  // Full Composer
  showFullComposer: boolean;
  fullComposerText: string;
  // Lightbox
  lightboxSrc: string | null;
  // Search Popover
  showSearch: boolean;
  // Contacts Drawer
  showContacts: boolean;
  // Create Menu (rail)
  showCreateMenu: boolean;
  // Create Category Modal
  showCreateCategoryModal: boolean;
  // Space name for top bar
  spaceName: string;
  // Space switcher
  spaces: Space[];
  currentSpaceId: string;
  showSpaceSwitcher: boolean;
  logoutArmed: boolean;
}

interface OctoComposerInputContext extends MessageInputContext {
  plainText(): string;
  setPlainText(text: string): void;
  send(overrideText?: string): Promise<void>;
}

const RAIL_PIN_LIMIT = 7;

export default class OctoSidepanelLayout extends Component<
  {},
  OctoSidepanelLayoutState
> {
  private conversationContext?: ConversationContext;
  private composerInputContext?: OctoComposerInputContext;
  private conversationListenerRemover?: () => void;
  private channelInfoListenerRemover?: () => void;
  private spinnerTimer?: ReturnType<typeof setInterval>;
  private logoutConfirmTimer?: ReturnType<typeof setTimeout>;
  private spinnerVerbIndex = 0;
  // Space 切换序列号：快速点击不同 Space 时，只有最后一次的异步回调被允许写状态，
  // 旧 seq 的回调会被丢弃，避免 Space A 的数据覆盖进 Space B 的 UI
  private spaceSelectSeq = 0;

  private SPINNER_VERBS = [
    "思考",
    "推理",
    "梳理",
    "分析",
    "检索",
    "归纳",
    "斟酌",
    "对齐",
    "琢磨",
    "审视",
    "审阅",
    "解析",
    "推演",
    "打磨",
    "提炼",
    "整理",
    "研读",
    "构思",
    "拟定",
    "沉浸",
    "咀嚼",
    "推敲",
    "整合",
    "抽丝剥茧",
    "揣摩",
    "复盘",
    "盘算",
    "铺开",
    "梳头绪",
    "穿针引线",
  ];

  constructor(props: {}) {
    super(props);

    const savedPins = localStorage.getItem("octo_sidepanel_pinned");
    let pinnedIds = new Set<string>();
    if (savedPins) {
      try {
        pinnedIds = new Set(JSON.parse(savedPins));
      } catch (err) {
        console.debug("[Extension] Failed to parse pinned ids:", err);
      }
    }

    this.state = {
      selectedChannel: null,
      selectedChannelName: "",
      showPicker: false,
      showInfoDrawer: false,
      pickerFilter: "group",
      conversationsVersion: 0,
      categoryNames: [],
      pinnedIds,
      memberLoading: false,
      members: [],
      theme: "light",
      layout: "message",
      readingMode: "cli",
      showSettings: false,
      // Full Composer
      showFullComposer: false,
      fullComposerText: "",
      // Lightbox
      lightboxSrc: null,
      // Search Popover
      showSearch: false,
      // Contacts Drawer
      showContacts: false,
      // Create Menu (rail)
      showCreateMenu: false,
      // Create Category Modal
      showCreateCategoryModal: false,
      // Space name
      spaceName: "",
      // Space switcher
      spaces: [],
      currentSpaceId: "",
      showSpaceSwitcher: false,
      logoutArmed: false,
    };
  }

  componentDidMount() {
    const themeMode = localStorage.getItem("theme-mode");
    const theme = themeMode === "1" ? "dark" : "light";
    const layout = localStorage.getItem("octo_v3_layout") || "message";
    if (theme === "dark") {
      document.body.setAttribute("theme-mode", "dark");
    } else {
      document.body.removeAttribute("theme-mode");
    }
    document.body.setAttribute("data-layout", layout);
    document.documentElement.setAttribute("data-layout", layout);
    // Ensure browser.storage.local has the current theme for CmdK iframe & overlay
    void setExtensionTheme(theme);
    this.setState({ theme, layout });

    this.initSpace().then(async () => {
      await WKSDK.shared().conversationManager.sync({});
      this.bumpConversationsVersion();
    });

    const conversationListener = () => {
      this.bumpConversationsVersion();
    };
    WKSDK.shared().conversationManager.addConversationListener(
      conversationListener
    );
    this.conversationListenerRemover = () => {
      WKSDK.shared().conversationManager.removeConversationListener(
        conversationListener
      );
    };

    const channelInfoListener = (channelInfo: ChannelInfo) => {
      const { selectedChannel } = this.state;
      if (selectedChannel && channelInfo.channel.isEqual(selectedChannel)) {
        this.setState({
          selectedChannelName:
            channelInfo.orgData?.displayName || channelInfo.title || "",
        });
      }
      this.bumpConversationsVersion();
    };
    WKSDK.shared().channelManager.addListener(channelInfoListener);
    this.channelInfoListenerRemover = () => {
      WKSDK.shared().channelManager.removeListener(channelInfoListener);
    };

    void this.loadCategoryNames();

    WKApp.endpointManager.setMethod(
      "showConversation",
      (param: any) => {
        const channel = param.channel as Channel;
        this.selectChannel(channel);
      },
      {}
    );

    document.addEventListener("keydown", this.handleEscKey);
    document.addEventListener("click", this.handleClickOutsideSettings);
    document.addEventListener("click", this.handleImageClick);
    this.syncSelectedConversationState();
  }

  componentDidUpdate(
    _prevProps: {},
    prevState: OctoSidepanelLayoutState
  ) {
    const prevChannel = prevState.selectedChannel;
    const nextChannel = this.state.selectedChannel;
    const prevKey = prevChannel
      ? `${prevChannel.channelID}:${prevChannel.channelType}`
      : "";
    const nextKey = nextChannel
      ? `${nextChannel.channelID}:${nextChannel.channelType}`
      : "";

    if (prevKey !== nextKey) {
      this.syncSelectedConversationState();
    }
  }

  componentWillUnmount() {
    this.conversationListenerRemover?.();
    this.channelInfoListenerRemover?.();
    if (this.spinnerTimer) clearInterval(this.spinnerTimer);
    if (this.logoutConfirmTimer) clearTimeout(this.logoutConfirmTimer);
    document.removeEventListener("keydown", this.handleEscKey);
    document.removeEventListener("click", this.handleClickOutsideSettings);
    document.removeEventListener("click", this.handleImageClick);
  }

  private syncSelectedConversationState() {
    const { selectedChannel } = this.state;
    void setExtensionSidepanelSelectedConversation(
      selectedChannel
        ? {
            channelId: selectedChannel.channelID,
            channelType: selectedChannel.channelType,
          }
        : null
    );
  }

  private resetLogoutArmed = () => {
    if (this.logoutConfirmTimer) {
      clearTimeout(this.logoutConfirmTimer);
      this.logoutConfirmTimer = undefined;
    }
    if (this.state.logoutArmed) {
      this.setState({ logoutArmed: false });
    }
  };

  private handleEscKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (this.state.logoutArmed) {
      this.resetLogoutArmed();
      return;
    }
    // Close overlays in z-index priority order (highest first)
    if (this.state.lightboxSrc) {
      this.setState({ lightboxSrc: null });
      return;
    }
    if (this.state.showFullComposer) {
      this.closeFullComposer(true);
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
    if (this.state.showSpaceSwitcher) {
      this.setState({ showSpaceSwitcher: false });
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
    this.spinnerVerbIndex = Math.floor(
      Math.random() * this.SPINNER_VERBS.length
    );
    this.spinnerTimer = setInterval(() => {
      this.spinnerVerbIndex =
        (this.spinnerVerbIndex + 1) % this.SPINNER_VERBS.length;
      const el = document.querySelector(
        ".octo-sidepanel-v3 .verb"
      ) as HTMLElement | null;
      if (el) {
        el.style.opacity = "0";
        setTimeout(() => {
          el.textContent = `Agent 正在 ${
            this.SPINNER_VERBS[this.spinnerVerbIndex]
          }…`;
          el.style.opacity = "1";
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
    const verb =
      this.SPINNER_VERBS[this.spinnerVerbIndex % this.SPINNER_VERBS.length];
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
      target.tagName === "IMG" &&
      target.closest(".wk-sidepanel-content") &&
      !target.closest(".wk-sidepanel-header-avatar") &&
      !target.closest(".octo-lightbox") &&
      !(target as HTMLImageElement).hasAttribute("data-has-lightbox")
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
    if (
      this.state.logoutArmed &&
      !target.closest(".wk-rail-action-logout")
    ) {
      this.resetLogoutArmed();
    }
    // Close settings popover
    if (this.state.showSettings) {
      if (
        !target.closest(".octo-settings-pop") &&
        !target.closest(".wk-rail-action-settings") &&
        !target.closest(".wk-sidepanel-topbar-settings-wrap")
      ) {
        this.setState({ showSettings: false });
      }
    }
    // Close create menu
    if (this.state.showCreateMenu) {
      if (
        !target.closest(".wk-rail-create-menu") &&
        !target.closest(".wk-rail-action-create")
      ) {
        this.setState({ showCreateMenu: false });
      }
    }
    // Close space switcher
    if (this.state.showSpaceSwitcher) {
      if (
        !target.closest(".octo-space-switcher-pop") &&
        !target.closest(".wk-sidepanel-topbar-space")
      ) {
        this.setState({ showSpaceSwitcher: false });
      }
    }
    // Close search popover
    if (this.state.showSearch) {
      if (
        !target.closest(".octo-search-pop") &&
        !target.closest(".wk-sidepanel-header-search")
      ) {
        this.setState({ showSearch: false });
      }
    }
  };

  private setTheme = (isDark: boolean) => {
    const theme = isDark ? "dark" : "light";
    if (isDark) {
      document.body.setAttribute("theme-mode", "dark");
    } else {
      document.body.removeAttribute("theme-mode");
    }
    localStorage.setItem("theme-mode", isDark ? "1" : "0");
    // Sync to browser.storage.local so CmdK iframe & overlay can pick it up
    void setExtensionTheme(theme);
    this.setState({ theme });
  };

  private setLayout = (layout: string) => {
    document.body.setAttribute("data-layout", layout);
    document.documentElement.setAttribute("data-layout", layout);
    localStorage.setItem("octo_v3_layout", layout);
    this.setState({ layout });
  };

  private toggleSettings = () => {
    this.setState((prev) => ({
      showSettings: !prev.showSettings,
      showCreateMenu: false,
      showSpaceSwitcher: false,
    }));
  };

  private toggleCreateMenu = () => {
    this.setState((prev) => ({
      showCreateMenu: !prev.showCreateMenu,
      showSettings: false,
      showSpaceSwitcher: false,
    }));
  };

  private toggleSpaceSwitcher = () => {
    this.setState((prev) => ({
      showSpaceSwitcher: !prev.showSpaceSwitcher,
      showSettings: false,
      showCreateMenu: false,
    }));
  };

  private handleSpaceSelect = async (spaceId: string) => {
    if (spaceId === this.state.currentSpaceId) {
      this.setState({ showSpaceSwitcher: false });
      return;
    }

    const seq = ++this.spaceSelectSeq;
    const isStale = () => seq !== this.spaceSelectSeq;

    let spaces = this.state.spaces;
    try {
      spaces = await SpaceService.shared.getMySpaces();
    } catch (e) {
      console.warn("[OctoSidepanelLayout] Failed to refresh spaces:", e);
    }
    if (isStale()) return;

    const target = spaces.find((s) => s.space_id === spaceId);
    if (!target) {
      showToast("该 Space 已不存在");
      this.setState({ spaces, showSpaceSwitcher: false });
      return;
    }

    WKApp.shared.currentSpaceId = spaceId;
    localStorage.setItem("currentSpaceId", spaceId);
    try {
      WKApp.mittBus.emit("space-changed", target);
    } catch (err) {
      console.debug("[Extension] space-changed emit failed:", err);
    }
    WKApp.shared.notifyListener();

    WKApp.shared.openChannel = undefined;
    WKSDK.shared().conversationManager.conversations = [];

    this.setState({
      spaces,
      currentSpaceId: spaceId,
      spaceName: target.name || "Octo",
      showSpaceSwitcher: false,
      selectedChannel: null,
      selectedChannelName: "",
      showInfoDrawer: false,
      members: [],
    });

    try {
      await WKSDK.shared().conversationManager.sync({});
      if (isStale()) return;
      this.bumpConversationsVersion();
      void this.loadCategoryNames();
    } catch (e) {
      console.warn(
        "[OctoSidepanelLayout] Failed to reload after space switch:",
        e
      );
    }
  };

  private bumpConversationsVersion = () => {
    this.setState((prev) => ({
      conversationsVersion: prev.conversationsVersion + 1,
    }));
    this.syncPinsAndFirstSelect();
  };

  private syncPinsAndFirstSelect = () => {
    const conversations = this.getConversations();

    const validIds = new Set<string>();
    for (const conv of conversations) {
      validIds.add(conv.channel.channelID);
    }
    const currentPins = this.state.pinnedIds;
    let pinsChanged = false;
    const prunedPins = new Set<string>();
    for (const id of currentPins) {
      if (validIds.has(id)) prunedPins.add(id);
      else pinsChanged = true;
    }
    if (pinsChanged) {
      localStorage.setItem(
        "octo_sidepanel_pinned",
        JSON.stringify([...prunedPins])
      );
      this.setState({ pinnedIds: prunedPins });
    }

    // Auto-seed: if no pins yet, pin the first 3 so rail is not empty.
    const effectivePins = pinsChanged ? prunedPins : currentPins;
    if (effectivePins.size === 0 && conversations.length > 0) {
      const seed = new Set<string>();
      for (const conv of conversations.slice(0, 3)) {
        seed.add(conv.channel.channelID);
      }
      if (seed.size > 0) {
        localStorage.setItem(
          "octo_sidepanel_pinned",
          JSON.stringify([...seed])
        );
        this.setState({ pinnedIds: seed });
      }
    }

    if (!this.state.selectedChannel && conversations.length > 0) {
      this.selectChannel(conversations[0].channel);
    }
  };

  private async loadCategoryNames() {
    const spaceId = WKApp.shared.currentSpaceId;
    if (!spaceId) {
      this.setState({ categoryNames: [] });
      return;
    }
    try {
      const items = await CategoryService.list(spaceId);
      this.setState({
        categoryNames: items.map((c) => c.name),
      });
    } catch (e) {
      console.warn("[OctoSidepanelLayout] Failed to load categories:", e);
    }
  }

  private async initSpace() {
    try {
      const spaces = await SpaceService.shared.getMySpaces();
      const savedSpaceId = localStorage.getItem("currentSpaceId");
      let currentSpace = spaces.find((s) => s.space_id === savedSpaceId);
      if (!currentSpace && spaces.length > 0) {
        currentSpace = spaces[0];
      }
      if (currentSpace) {
        WKApp.shared.currentSpaceId = currentSpace.space_id;
        localStorage.setItem("currentSpaceId", currentSpace.space_id);
        this.setState({
          spaceName: currentSpace.name || "Octo",
          spaces,
          currentSpaceId: currentSpace.space_id,
        });
      } else {
        this.setState({ spaces });
      }
    } catch (e) {
      console.warn("[OctoSidepanelLayout] Failed to init space:", e);
    }
  }

  private async fetchMembers(channel: Channel) {
    if (channel.channelType === ChannelTypePerson) {
      this.setState({ members: [], memberLoading: false });
      return;
    }

    this.setState({ memberLoading: true });
    // 快速切换频道时多个 subscribers 请求并发，靠请求时的 channel 身份比对当前 state，
    // 只有仍选中的频道才允许写回 members / memberLoading，其余请求默默丢弃
    const isStale = () => {
      const current = this.state.selectedChannel;
      return (
        !current ||
        current.channelID !== channel.channelID ||
        current.channelType !== channel.channelType
      );
    };
    try {
      const data = await WKApp.dataSource.channelDataSource.subscribers(
        channel,
        {
          page: 1,
          limit: 1000,
        }
      );
      if (isStale()) return;
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
      console.warn("[OctoSidepanelLayout] Failed to load members:", e);
      if (isStale()) return;
      this.setState({ members: [], memberLoading: false });
    }
  }

  private selectChannel(channel: Channel) {
    WKApp.shared.openChannel = channel;
    const channelInfo = WKSDK.shared().channelManager.getChannelInfo(channel);
    const name =
      channelInfo?.orgData?.displayName ||
      channelInfo?.title ||
      channel.channelID;

    if (!channelInfo) {
      WKSDK.shared().channelManager.fetchChannelInfo(channel);
    }

    this.composerInputContext = undefined;
    this.setState({
      selectedChannel: channel,
      selectedChannelName: name,
      showPicker: false,
      showInfoDrawer: false,
      members: [],
      showFullComposer: false,
      fullComposerText: "",
    });

    if (channel.channelType !== ChannelTypePerson) {
      void this.fetchMembers(channel);
    }
  }

  private getConversations(): ConversationWrap[] {
    const convs = WKSDK.shared().conversationManager.conversations || [];
    return convs
      .filter((c) => !shouldSkipChannelForSpace(c.channel))
      .filter((c) => !shouldSkipPersonConversationForSpace(c))
      .map((c) => new ConversationWrap(c));
  }

  private handlePickerToggle = () => {
    if (this.state.showPicker) {
      this.setState({ showPicker: false });
      return;
    }
    this.setState({
      showPicker: true,
      showInfoDrawer: false,
    });
    void this.loadCategoryNames();
  };

  private handlePickerClose = () => {
    this.setState({ showPicker: false });
  };

  private handleConversationClick = (conv: ConversationWrap) => {
    WKApp.mittBus.emit("wk:close-thread-panel", undefined);
    this.selectChannel(conv.channel);
  };

  private handleListClearMessages = async (channel: Channel) => {
    const conversation = WKSDK.shared().conversationManager.findConversation(
      channel
    );
    if (!conversation) return;
    try {
      await WKApp.conversationProvider.clearConversationMessages(conversation);
      conversation.lastMessage = undefined;
      conversation.unread = 0;
      WKApp.endpointManager.invoke(EndpointID.clearChannelMessages, channel);
      this.bumpConversationsVersion();
    } catch (e) {
      console.warn("[OctoSidepanelLayout] Failed to clear messages:", e);
    }
  };

  private handleThreadOverflow = (groupNo: string) => {
    WKApp.mittBus.emit("wk:pending-thread", { groupNo, thread: null });
    const { selectedChannel } = this.state;
    if (selectedChannel?.channelID !== groupNo) {
      this.selectChannel(new Channel(groupNo, ChannelTypeGroup));
    }
  };

  private handleRefresh = async () => {
    await WKSDK.shared().conversationManager.sync({});
    const { selectedChannel } = this.state;
    if (selectedChannel && selectedChannel.channelType !== ChannelTypePerson) {
      await this.fetchMembers(selectedChannel);
    }
    this.bumpConversationsVersion();
  };

  private togglePin = (channelId: string) => {
    this.setState((prev) => {
      const next = new Set(prev.pinnedIds);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        if (next.size >= RAIL_PIN_LIMIT) {
          showToast(`最多固定 ${RAIL_PIN_LIMIT} 个`);
          return null;
        }
        next.add(channelId);
      }
      localStorage.setItem("octo_sidepanel_pinned", JSON.stringify([...next]));
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

  private handleAccountLogout = () => {
    if (this.state.logoutArmed) {
      this.resetLogoutArmed();
      WKApp.shared.logout();
      return;
    }

    this.setState({ showSettings: false, logoutArmed: true });
    showToast("再次点击退出登录");
    this.logoutConfirmTimer = setTimeout(() => {
      this.logoutConfirmTimer = undefined;
      this.setState({ logoutArmed: false });
    }, 2000);
  };

  private handleRenameGroup = async () => {
    const { selectedChannel, selectedChannelName } = this.state;
    if (!selectedChannel || selectedChannel.channelType === ChannelTypePerson)
      return;
    const nextName = window.prompt(
      "输入新的群聊名称",
      selectedChannelName || ""
    );
    const trimmed = nextName?.trim();
    if (!trimmed || trimmed === selectedChannelName) return;
    try {
      await WKApp.dataSource.channelDataSource.updateField(
        selectedChannel,
        "name",
        trimmed
      );
      await WKSDK.shared()
        .channelManager.fetchChannelInfo(selectedChannel)
        .catch(() => null);
      this.setState({ selectedChannelName: trimmed });
      this.bumpConversationsVersion();
    } catch (e) {
      console.warn("[OctoSidepanelLayout] Failed to rename group:", e);
    }
  };

  private handleClearMessages = async () => {
    const { selectedChannel } = this.state;
    if (!selectedChannel) return;
    this.confirmAction("是否清空此会话的所有消息？", async () => {
      const conversation =
        WKSDK.shared().conversationManager.findConversation(selectedChannel);
      if (!conversation) return;
      await WKApp.conversationProvider.clearConversationMessages(conversation);
      conversation.lastMessage = undefined;
      WKApp.endpointManager.invoke(
        EndpointID.clearChannelMessages,
        selectedChannel
      );
    });
  };

  private handleLeaveChannel = async () => {
    const { selectedChannel } = this.state;
    if (!selectedChannel || selectedChannel.channelType === ChannelTypePerson)
      return;
    this.confirmAction(
      "退出后不会通知群里其他成员，且不会再接收此群聊消息",
      async () => {
        await WKApp.dataSource.channelDataSource
          .exitChannel(selectedChannel)
          .catch((e) => {
            console.warn("[OctoSidepanelLayout] Failed to leave channel:", e);
          });
        await WKApp.conversationProvider
          .deleteConversation(selectedChannel)
          .catch(() => null);
        this.setState({
          selectedChannel: null,
          selectedChannelName: "",
          showInfoDrawer: false,
          members: [],
        });
        await WKSDK.shared().conversationManager.sync({});
        this.bumpConversationsVersion();
      }
    );
  };

  // ================================================================
  // Full Composer
  // ================================================================

  private openFullComposer = (seedText?: string) => {
    this.setState({
      showFullComposer: true,
      fullComposerText:
        seedText ?? this.composerInputContext?.plainText() ?? "",
    });
  };

  private closeFullComposer = (syncBack = true) => {
    if (syncBack && this.composerInputContext) {
      this.composerInputContext.setPlainText(this.state.fullComposerText);
    }
    this.setState({ showFullComposer: false });
  };

  private submitFullComposer = () => {
    const { fullComposerText, selectedChannel } = this.state;
    const trimmed = fullComposerText.trim();
    if (!trimmed || !selectedChannel) return;

    if (this.composerInputContext) {
      void this.composerInputContext.send(trimmed);
    }

    this.setState({ showFullComposer: false, fullComposerText: "" });
  };

  private handleFullComposerKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.closeFullComposer(true);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
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
          <button
            className="octo-fullcomp-close"
            onClick={() => this.closeFullComposer(true)}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="octo-fullcomp-body">
          <textarea
            className="octo-fullcomp-textarea"
            value={this.state.fullComposerText}
            onChange={(e) =>
              this.setState({ fullComposerText: e.target.value })
            }
            onKeyDown={this.handleFullComposerKeyDown}
            placeholder="输入消息…"
            autoFocus
          />
        </div>
        <div className="octo-fullcomp-foot">
          <span className="octo-fullcomp-hint">⌘↵ 发送 · Esc 收起</span>
          <button
            className="octo-fullcomp-send"
            onClick={this.submitFullComposer}
            type="button"
          >
            发送
          </button>
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

  // ================================================================
  // Search Popover
  // ================================================================

  private handleSearchToggle = () => {
    this.setState((prev) => ({ showSearch: !prev.showSearch }));
  };

  // ================================================================
  // Contacts Drawer
  // ================================================================

  // ================================================================
  // Contacts Drawer
  // ================================================================

  private toggleContacts = () => {
    this.setState((prev) => ({ showContacts: !prev.showContacts }));
  };

  private closeContacts = () => {
    this.setState({ showContacts: false });
  };

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

  private getRailItems(): {
    visible: RailItem[];
    hiddenCount: number;
  } {
    const { pinnedIds } = this.state;
    const conversations = this.getConversations();

    const items: RailItem[] = conversations.map((conv) => {
      const info = WKSDK.shared().channelManager.getChannelInfo(conv.channel);
      const name =
        info?.orgData?.displayName || info?.title || conv.channel.channelID;
      const parentGroupNo = info?.orgData?.parentGroupNo as string | undefined;
      const parentInfo = parentGroupNo
        ? WKSDK.shared().channelManager.getChannelInfo(
            new Channel(parentGroupNo, ChannelTypeGroup)
          )
        : undefined;
      const muted = Boolean(info?.mute || parentInfo?.mute);
      const mentionCount =
        conv.conversation.reminders?.filter((r: any) => !r.done).length ?? 0;
      const spaceId = WKApp.shared.currentSpaceId;
      let unread = 0;
      if (
        spaceId &&
        conv.channel.channelType === ChannelTypePerson &&
        (conv.conversation as any).extra?.spaceUnread !== undefined
      ) {
        unread = Math.max(
          0,
          Number((conv.conversation as any).extra.spaceUnread || 0)
        );
      } else {
        unread = Math.max(0, Number(conv.unread || 0));
      }
      return {
        channelId: conv.channel.channelID,
        channelType: conv.channel.channelType,
        name,
        unread,
        mentionCount,
        muted,
      };
    });

    const visible = items.filter((t) => pinnedIds.has(t.channelId));
    const hiddenCount = items.length - visible.length;

    return { visible, hiddenCount };
  }

  private renderTopBar() {
    const {
      spaceName,
      theme,
      showSettings,
      readingMode,
      spaces,
      currentSpaceId,
      showSpaceSwitcher,
    } = this.state;
    const selectedChannel = this.state.selectedChannel;
    const isPinned = selectedChannel
      ? this.state.pinnedIds.has(selectedChannel.channelID)
      : false;

    // Map theme state to active theme option for UI
    const activeThemeOption = theme === "dark" ? "moon" : "paper";
    const hasMultipleSpaces = spaces.length > 1;

    return (
      <div className="wk-sidepanel-topbar">
        <button
          type="button"
          className={`wk-sidepanel-topbar-space${
            showSpaceSwitcher ? " is-active" : ""
          }${hasMultipleSpaces ? "" : " is-disabled"}`}
          title={hasMultipleSpaces ? "切换空间" : spaceName}
          onClick={hasMultipleSpaces ? this.toggleSpaceSwitcher : undefined}
          disabled={!hasMultipleSpaces}
        >
          <span className="wk-sidepanel-topbar-logo">O</span>
          <span className="wk-sidepanel-topbar-brand">Octo</span>
          <span className="wk-sidepanel-topbar-sep">|</span>
          <span className="wk-sidepanel-topbar-space-name">
            {spaceName || "Workspace"}
          </span>
          {hasMultipleSpaces && (
            <svg
              className="wk-sidepanel-topbar-space-caret"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>
        {showSpaceSwitcher && hasMultipleSpaces && (
          <OctoSpaceSwitcherPopover
            isOpen
            spaces={spaces}
            currentSpaceId={currentSpaceId}
            onSelect={(spaceId) => {
              void this.handleSpaceSelect(spaceId);
            }}
          />
        )}
        <div className="wk-sidepanel-topbar-actions">
          {/* 固定/取消固定当前频道 */}
          {selectedChannel && (
            <button
              className={`wk-sidepanel-topbar-btn${
                isPinned ? " is-active" : ""
              }`}
              title={isPinned ? "取消固定" : "固定到 Rail"}
              onClick={() => this.togglePin(selectedChannel.channelID)}
              type="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14l-2-7V4H7v6z" />
              </svg>
            </button>
          )}
          {/* 设置 */}
          <div className="wk-sidepanel-topbar-settings-wrap">
            <button
              className={`wk-sidepanel-topbar-btn${
                showSettings ? " is-active" : ""
              }`}
              title="设置"
              onClick={this.toggleSettings}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {showSettings && (
              <div className="octo-settings-pop is-open wk-topbar-settings-pop">
                {/* 阅读模式 */}
                <div className="octo-settings-section">阅读模式</div>
                <div className="octo-settings-seg">
                  {[
                    { id: "message" as const, label: "消息版" },
                    { id: "cli" as const, label: "简化版" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      className={`octo-settings-seg-btn${
                        readingMode === m.id ? " is-active" : ""
                      }`}
                      onClick={() => this.setState({ readingMode: m.id })}
                    >
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
                {/* 主题 */}
                <div className="octo-settings-section">主题</div>
                <div className="octo-settings-seg">
                  {[
                    {
                      id: "paper",
                      label: "Paper",
                      isDark: false,
                      dotTheme: "paper",
                    },
                    {
                      id: "moon",
                      label: "Moon",
                      isDark: true,
                      dotTheme: "moon",
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      className={`octo-settings-seg-btn${
                        activeThemeOption === t.id ? " is-active" : ""
                      }`}
                      onClick={() => this.setTheme(t.isDark)}
                    >
                      <span
                        className="octo-settings-seg-dot"
                        data-theme={t.dotTheme}
                      />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
          const railItemBackground = getTitleColor(item.name);

          const cls = [
            "wk-sidepanel-rail-item",
            isCurrent && "is-current",
            isPinned && "is-pinned",
            !isPinned && (hasUnread || hasMention) && "is-unread-only",
            hasMention && "is-mention",
            item.muted && "is-muted",
          ]
            .filter(Boolean)
            .join(" ");

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
                <span className="wk-sidepanel-rail-icon wk-sidepanel-rail-icon-mention">
                  @
                </span>
              ) : isPrivate ? (
                <span
                  className="wk-sidepanel-rail-icon wk-sidepanel-rail-icon-pm"
                  style={{ background: railItemBackground }}
                >
                  {getFirstChar(item.name)}
                </span>
              ) : (
                <span
                  className="wk-sidepanel-rail-icon wk-sidepanel-rail-icon-ch"
                  style={{ background: railItemBackground }}
                >
                  {getFirstChar(item.name)}
                </span>
              )}
              {!hasMention && hasUnread && (
                <span
                  className={
                    item.muted
                      ? "wk-sidepanel-rail-badge wk-sidepanel-rail-badge-muted"
                      : "wk-sidepanel-rail-badge"
                  }
                >
                  {item.unread > 99 ? "99+" : item.unread}
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
          className={`wk-rail-action wk-rail-action-contacts${
            this.state.showContacts ? " is-active" : ""
          }`}
          title="通讯录"
          onClick={this.toggleContacts}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
            <path
              d="M22 21v-2a4 4 0 0 0-3-3.87"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 3.13a4 4 0 0 1 0 7.75"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="wk-rail-action-wrap">
          <button
            className={`wk-rail-action wk-rail-action-create${
              this.state.showCreateMenu ? " is-active" : ""
            }`}
            title="创建"
            onClick={this.toggleCreateMenu}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
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
                    baseContext.showConversationSelect(
                      (channels: Channel[]) => {
                        if (channels?.length > 0) {
                          WKApp.endpoints.showConversation(channels[0]);
                        }
                      },
                      "找人聊天"
                    );
                  } else {
                    showToast("发起私聊 · 环境未就绪，请稍后重试");
                  }
                }}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
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
                    showToast("创建群聊 · 环境未就绪，请稍后重试");
                  }
                }}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>创建群聊</span>
              </button>
              {/* 创建分组 */}
              <button
                className="wk-rail-create-menu-item"
                onClick={() => {
                  this.setState({
                    showCreateMenu: false,
                    showCreateCategoryModal: true,
                  });
                }}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="7"
                    height="7"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="14"
                    y="3"
                    width="7"
                    height="7"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="3"
                    y="14"
                    width="7"
                    height="7"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="14"
                    y="14"
                    width="7"
                    height="7"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <span>创建分组</span>
              </button>
            </div>
          )}
        </div>
        <button
          className={`wk-rail-action wk-rail-action-logout${
            this.state.logoutArmed ? " is-armed" : ""
          }`}
          title={this.state.logoutArmed ? "再次点击退出登录" : "退出登录"}
          onClick={this.handleAccountLogout}
          type="button"
        >
          {renderDrawerIcon("logout")}
        </button>
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
    } = this.state;
    if (!selectedChannel) return null;
    const pinned = pinnedIds.has(selectedChannel.channelID);

    return (
      <OctoInfoDrawer
        isOpen={showInfoDrawer}
        onClose={() => this.setState({ showInfoDrawer: false })}
        selectedChannel={selectedChannel}
        selectedChannelName={selectedChannelName}
        members={members}
        memberLoading={memberLoading}
        pinned={pinned}
        onTogglePin={this.togglePin}
        onRename={this.handleRenameGroup}
        onClear={this.handleClearMessages}
        onLeave={this.handleLeaveChannel}
        onMuteChanged={this.bumpConversationsVersion}
      />
    );
  }

  render() {
    const {
      selectedChannel,
      selectedChannelName,
      showPicker,
      members,
      memberLoading,
      pickerFilter,
    } = this.state;
    const isPrivate = selectedChannel?.channelType === ChannelTypePerson;
    const memberCountText = memberLoading
      ? "..."
      : String(Math.max(members.length, 0));

    return (
      <div className="octo-sidepanel-shell">
        <div className="octo-sidepanel-app">
          <div className="wk-sidepanel-layout">
            {this.renderTopBar()}
            <div className="wk-sidepanel-body">
              {this.renderRail()}

              <div className="wk-sidepanel-main">
                <header className="wk-sidepanel-header">
                  {selectedChannel ? (
                    <>
                      {this.getChannelIcon(selectedChannel)}
                      <div className="wk-sidepanel-header-title">
                        <span className="wk-sidepanel-header-name">
                          {selectedChannelName}
                        </span>
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
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
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
                        title={isPrivate ? "会话信息" : "查看群信息"}
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
                    <div className="octo-sidepanel-conversation-shell">
                      <ErrorBoundaryComponent moduleName="会话">
                        <ConversationComponent
                          key={selectedChannel.getChannelKey()}
                          channel={selectedChannel}
                          hideMessageInput={true}
                          readingMode={this.state.readingMode}
                          onContext={(
                            ctx: ConversationContext & {
                              messageInputContext?: MessageInputContext;
                            }
                          ) => {
                            this.conversationContext = ctx;
                            this.forceUpdate();
                          }}
                        />
                      </ErrorBoundaryComponent>
                      {this.conversationContext && (
                        <OctoComposer
                          key="octo-composer"
                          channel={selectedChannel}
                          conversationContext={this.conversationContext}
                          contextClassName="sidepanel"
                          onExpand={(text) => this.openFullComposer(text)}
                          placeholder={
                            selectedChannel.channelType === ChannelTypePerson
                              ? `发消息给 ${this.state.selectedChannelName}`
                              : `#${this.state.selectedChannelName}`
                          }
                        />
                      )}
                    </div>
                  ) : (
                    <div className="wk-sidepanel-empty">
                      <div className="wk-sidepanel-empty-icon">
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 48 48"
                          fill="none"
                        >
                          <rect
                            x="4"
                            y="8"
                            width="40"
                            height="32"
                            rx="4"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M4 16h40"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <circle cx="10" cy="12" r="1.5" fill="currentColor" />
                          <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                          <circle cx="20" cy="12" r="1.5" fill="currentColor" />
                        </svg>
                      </div>
                      <p className="wk-sidepanel-empty-text">
                        选择一个频道开始对话
                      </p>
                      <button
                        className="wk-sidepanel-empty-btn"
                        onClick={this.handlePickerToggle}
                      >
                        选择频道
                      </button>
                    </div>
                  )}
                </div>

                {/* Search Popover — positioned inside main, below header */}
                <OctoSearchPopover isOpen={this.state.showSearch} />

                {/* Full Composer — covers entire main area */}
                {this.renderFullComposer()}
              </div>

              {/* Info Drawer Backdrop — dims the rail when info drawer is open */}
              {this.state.showInfoDrawer && (
                <div
                  className="wk-sidepanel-info-backdrop is-open"
                  onClick={() => this.setState({ showInfoDrawer: false })}
                />
              )}

              {/* Info Drawer — covers main area (top-to-bottom) but not Rail */}
              {this.renderInfoDrawer()}

              {/* Picker Backdrop — dims the rail when picker is open */}
              {showPicker && (
                <div
                  className="wk-sidepanel-picker-backdrop is-open"
                  onClick={this.handlePickerClose}
                />
              )}

              {/* Conversation List Drawer — covers main area but not Rail */}
              <div
                className={`wk-sidepanel-picker-drawer${
                  showPicker ? " is-open" : ""
                }`}
              >
                <div className="octo-picker-filter-tabs">
                  {(
                    [
                      { id: "group", label: "群聊" },
                      { id: "dm", label: "私聊" },
                    ] as { id: ConvFilter; label: string }[]
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`octo-picker-filter-tab${
                        pickerFilter === t.id ? " is-active" : ""
                      }`}
                      onClick={() => this.setState({ pickerFilter: t.id })}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="octo-picker-list-wrap">
                  <ChatConversationListComponent
                    conversations={this.getConversations()}
                    filter={pickerFilter}
                    select={selectedChannel ?? undefined}
                    onConversationClick={this.handleConversationClick}
                    onClearMessages={this.handleListClearMessages}
                    onThreadOverflowClick={this.handleThreadOverflow}
                    onGroupCreated={() => {
                      void WKSDK.shared().conversationManager.sync({});
                      void this.loadCategoryNames();
                      this.bumpConversationsVersion();
                    }}
                  />
                </div>
              </div>

              {/* Contacts Backdrop — dims the rail when contacts is open */}
              {this.state.showContacts && (
                <div
                  className="wk-sidepanel-contacts-backdrop is-open"
                  onClick={this.toggleContacts}
                />
              )}

              {/* Contacts Drawer — covers main area but not Rail */}
              <OctoContactsDrawer
                isOpen={this.state.showContacts}
                onClose={this.closeContacts}
              />
            </div>
          </div>
        </div>

        {/* Lightbox — fixed, top-level overlay */}
        <OctoLightbox src={this.state.lightboxSrc} onClose={this.closeLightbox} />

        {/* Create Category Modal */}
        <CreateCategoryModalComponent
          visible={this.state.showCreateCategoryModal}
          existingNames={this.state.categoryNames}
          onConfirm={async (name: string) => {
            const spaceId = WKApp.shared.currentSpaceId;
            if (!spaceId) {
              showToast("未选中 Space，无法创建分组");
              return;
            }
            await CategoryService.create(spaceId, { name });
            this.setState({ showCreateCategoryModal: false });
            void this.loadCategoryNames();
            this.bumpConversationsVersion();
          }}
          onCancel={() => this.setState({ showCreateCategoryModal: false })}
        />
      </div>
    );
  }
}
