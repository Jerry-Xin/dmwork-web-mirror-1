import React from 'react';
import { createRoot } from 'react-dom/client';
import '@dmwork/base/src/theme/tokens.css';
import {
  BaseModule,
  WKApp,
  shouldSkipChannelForSpace,
  shouldSkipPersonConversationForSpace,
} from '@dmwork/base';
import StorageService from '@dmwork/base/src/Service/StorageService';
import { LoginModule } from '@dmwork/login';
import { DataSourceModule } from '@dmwork/datasource';
import { ContactsModule } from '@dmwork/contacts';
import { version as pkgVersion } from '../../../web/package.json';
import { Channel, ChannelTypePerson, WKSDK } from 'wukongimjssdk';
import App from '../../../web/src/App';
import OctoSidepanelLayout from './OctoSidepanelLayout';
import OctoShell from './OctoShell';
import { initOctoTheme } from './useOctoTheme';
import './style.css';
import {
  DEFAULT_API_URL,
  EXTENSION_MESSAGE_TYPE,
  normalizeApiURL,
  type ConversationTarget,
  type ExtensionRuntimeMessage,
} from '../../utils/extensionRuntime';
import {
  clearPendingConversation,
  getPendingConversation,
  setExtensionSidepanelActive,
  setPendingConversation,
} from '../../utils/extensionStorage';
import {
  installExtensionLogoutBridge,
  syncExtensionAuthStateFromWKApp,
} from '../../utils/extensionAuthSession';

// 标记扩展环境（Layout 等组件据此跳过 window.location.href 硬跳转）
(window as any).__POWERED_EXTENSION__ = true;

// 扩展环境使用 localStorage 替代 sessionStorage，确保侧边面板关闭重开后登录状态不丢失
StorageService.shared.setItem = (key, value) => localStorage.setItem(key, value);
StorageService.shared.getItem = (key) => localStorage.getItem(key);
StorageService.shared.removeItem = (key) => localStorage.removeItem(key);

// API 配置（扩展环境直接用完整 URL）
const apiURL = normalizeApiURL(DEFAULT_API_URL);
WKApp.apiClient.config.apiURL = apiURL;
WKApp.apiClient.config.tokenCallback = () => WKApp.loginInfo.token;
WKApp.config.appVersion = pkgVersion;
WKApp.config.appName = 'Octo';

WKApp.loginInfo.load();

async function openConversation(target: ConversationTarget): Promise<boolean> {
  if (!WKApp.shared.isLogined()) {
    return false;
  }

  WKApp.endpoints.showConversation(
    new Channel(target.channelId, target.channelType),
  );
  return true;
}

let pendingConversationRetryId: number | undefined;
// 轮询截止时间：解决 background 的 setPendingConversation 与 sidepanel 启动读 storage 的竞态。
// 每次 ensurePendingConversationRetry 会把截止时间往后推，避免 retry 刚起来就被空读自杀。
let pendingConversationRetryDeadline = 0;
const PENDING_CONVERSATION_RETRY_WINDOW_MS = 30000;
let lastSyncedSpaceId = localStorage.getItem('currentSpaceId') || '';

function stopPendingConversationRetry(): void {
  if (pendingConversationRetryId !== undefined) {
    window.clearInterval(pendingConversationRetryId);
    pendingConversationRetryId = undefined;
  }
  pendingConversationRetryDeadline = 0;
}

async function consumePendingConversation(): Promise<void> {
  const target = await getPendingConversation();
  if (!target) {
    // 空读可能只是 background 的 storage 写还没落；仅在截止时间到了才终止轮询
    if (Date.now() >= pendingConversationRetryDeadline) {
      stopPendingConversationRetry();
    }
    return;
  }

  const opened = await openConversation(target);
  if (opened) {
    await clearPendingConversation();
    stopPendingConversationRetry();
  }
}

function ensurePendingConversationRetry(): void {
  pendingConversationRetryDeadline =
    Date.now() + PENDING_CONVERSATION_RETRY_WINDOW_MS;
  if (pendingConversationRetryId === undefined) {
    pendingConversationRetryId = window.setInterval(() => {
      void consumePendingConversation();
    }, 1000);
  }
}

window.setInterval(() => {
  const currentSpaceId = localStorage.getItem('currentSpaceId') || '';
  if (currentSpaceId === lastSyncedSpaceId) {
    return;
  }
  lastSyncedSpaceId = currentSpaceId;
  void syncExtensionAuthStateFromWKApp(apiURL);
  syncSidepanelBadge();
}, 1000);

const originalLoginSave = WKApp.loginInfo.save.bind(WKApp.loginInfo);
WKApp.loginInfo.save = () => {
  originalLoginSave();
  void syncExtensionAuthStateFromWKApp(apiURL);
};
installExtensionLogoutBridge();

// 注册模块
WKApp.shared.registerModule(new BaseModule());
WKApp.shared.registerModule(new DataSourceModule());
WKApp.shared.registerModule(new LoginModule());
WKApp.shared.registerModule(new ContactsModule());

WKApp.shared.startup();

// 注册扩展专用主页布局（替代 MainPage）
WKApp.shared.extensionMainPage = OctoSidepanelLayout as any;

void syncExtensionAuthStateFromWKApp(apiURL);

function hasUnreadConversation(): boolean {
  for (const conversation of WKSDK.shared().conversationManager.conversations) {
    const channelInfo = WKSDK.shared().channelManager.getChannelInfo(conversation.channel);
    if (channelInfo?.mute) {
      continue;
    }

    if (shouldSkipChannelForSpace(conversation.channel)) {
      continue;
    }

    if (shouldSkipPersonConversationForSpace(conversation)) {
      continue;
    }

    const currentSpaceId = WKApp.shared.currentSpaceId;
    if (
      currentSpaceId &&
      conversation.channel.channelType === ChannelTypePerson &&
      conversation.extra?.spaceUnread !== undefined
    ) {
      if (Math.max(0, Number(conversation.extra.spaceUnread || 0)) > 0) {
        return true;
      }
    } else if (Math.max(0, Number(conversation.unread || 0)) > 0) {
      return true;
    }
  }

  return false;
}

function syncSidepanelBadge(): void {
  void browser.runtime.sendMessage({
    type: EXTENSION_MESSAGE_TYPE.sidepanelBadgeSync,
    hasUnread: hasUnreadConversation(),
  } satisfies ExtensionRuntimeMessage).catch(() => {});
}

function syncSidepanelState(active: boolean): void {
  void setExtensionSidepanelActive(active);
  void browser.runtime.sendMessage({
    type: EXTENSION_MESSAGE_TYPE.sidepanelState,
    active,
  } satisfies ExtensionRuntimeMessage).catch(() => {});
}

WKSDK.shared().conversationManager.addConversationListener(() => {
  syncSidepanelBadge();
});

WKSDK.shared().channelManager.addListener(() => {
  syncSidepanelBadge();
});

window.addEventListener('pagehide', () => {
  syncSidepanelState(false);
});

window.addEventListener('beforeunload', () => {
  syncSidepanelState(false);
});

function handleClosePanel() {
  try {
    window.close();
  } catch {}
}

// 渲染：先初始化主题（同步），再挂载 React
initOctoTheme();

const container = document.getElementById('root')!;
const root = createRoot(container);
document.body.classList.add('octo-sidepanel-v3');
root.render(
  <React.StrictMode>
    <OctoShell onClose={handleClosePanel}>
      <App />
    </OctoShell>
  </React.StrictMode>,
);

browser.runtime.onMessage.addListener((message: ExtensionRuntimeMessage) => {
  if (message.type === EXTENSION_MESSAGE_TYPE.openConversation) {
    void setPendingConversation(message.target).then(() => {
      ensurePendingConversationRetry();
      void consumePendingConversation();
    });
  }
});

ensurePendingConversationRetry();
void consumePendingConversation();
syncSidepanelState(true);
syncSidepanelBadge();
