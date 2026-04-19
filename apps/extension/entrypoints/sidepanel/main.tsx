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
import './style.css';
import {
  DEFAULT_API_URL,
  EXTENSION_MESSAGE_TYPE,
  normalizeApiURL,
  type ConversationTarget,
  type ExtensionAuthState,
  type ExtensionRuntimeMessage,
} from '../../utils/extensionRuntime';
import {
  clearExtensionAuthState,
  clearPendingConversation,
  getPendingConversation,
  setExtensionAuthState,
  setPendingConversation,
} from '../../utils/extensionStorage';

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

function getAuthSnapshot(): ExtensionAuthState {
  return {
    loggedIn: WKApp.loginInfo.isLogined(),
    uid: WKApp.loginInfo.uid || '',
    token: WKApp.loginInfo.token || '',
    apiURL,
    currentSpaceId: localStorage.getItem('currentSpaceId') || '',
  };
}

async function syncExtensionAuthState(): Promise<void> {
  const auth = getAuthSnapshot();
  if (auth.loggedIn && auth.token) {
    await setExtensionAuthState(auth);
    await browser.runtime.sendMessage({
      type: EXTENSION_MESSAGE_TYPE.authChanged,
      auth,
    } satisfies ExtensionRuntimeMessage).catch(() => {});
    return;
  }

  await clearExtensionAuthState();
  await browser.runtime.sendMessage({
    type: EXTENSION_MESSAGE_TYPE.authCleared,
  } satisfies ExtensionRuntimeMessage).catch(() => {});
  await browser.runtime.sendMessage({
    type: EXTENSION_MESSAGE_TYPE.sidepanelBadgeSync,
    hasUnread: false,
  } satisfies ExtensionRuntimeMessage).catch(() => {});
}

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
let lastSyncedSpaceId = localStorage.getItem('currentSpaceId') || '';

async function consumePendingConversation(): Promise<void> {
  const target = await getPendingConversation();
  if (!target) {
    if (pendingConversationRetryId) {
      window.clearInterval(pendingConversationRetryId);
      pendingConversationRetryId = undefined;
    }
    return;
  }

  const opened = await openConversation(target);
  if (opened) {
    await clearPendingConversation();
    if (pendingConversationRetryId) {
      window.clearInterval(pendingConversationRetryId);
      pendingConversationRetryId = undefined;
    }
  }
}

function ensurePendingConversationRetry(): void {
  if (!pendingConversationRetryId) {
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
  void syncExtensionAuthState();
  syncSidepanelBadge();
}, 1000);

const originalLoginSave = WKApp.loginInfo.save.bind(WKApp.loginInfo);
WKApp.loginInfo.save = () => {
  originalLoginSave();
  void syncExtensionAuthState();
};

const originalLogout = WKApp.shared.logout.bind(WKApp.shared);
WKApp.shared.logout = () => {
  void clearPendingConversation()
    .then(() => clearExtensionAuthState())
    .then(() =>
      browser.runtime.sendMessage({
        type: EXTENSION_MESSAGE_TYPE.authCleared,
      } satisfies ExtensionRuntimeMessage).catch(() => {}),
    )
    .then(() =>
      browser.runtime.sendMessage({
        type: EXTENSION_MESSAGE_TYPE.sidepanelBadgeSync,
        hasUnread: false,
      } satisfies ExtensionRuntimeMessage).catch(() => {}),
    )
    .finally(() => {
      originalLogout();
    });
};

// 注册模块
WKApp.shared.registerModule(new BaseModule());
WKApp.shared.registerModule(new DataSourceModule());
WKApp.shared.registerModule(new LoginModule());
WKApp.shared.registerModule(new ContactsModule());

WKApp.shared.startup();

// 注册扩展专用主页布局（替代 MainPage）
WKApp.shared.extensionMainPage = OctoSidepanelLayout as any;

void syncExtensionAuthState();

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

function handleOpenOptions() {
  try {
    browser.runtime.openOptionsPage();
  } catch {}
}

function handleClosePanel() {
  try {
    window.close();
  } catch {}
}

// 渲染
const container = document.getElementById('root')!;
const root = createRoot(container);
document.body.dataset.layout = 'message';
document.body.classList.add('octo-sidepanel-v3');
root.render(
  <React.StrictMode>
    <div className="octo-sidepanel-shell">
      <div className="octo-sidepanel-demo-bar">
        <span className="octo-sidepanel-demo-logo">O</span>
        <span className="octo-sidepanel-demo-name">Octo</span>
        <span className="octo-sidepanel-demo-space">FT-A2 工作区</span>
        <span className="octo-sidepanel-demo-spacer" />
        <button className="octo-sidepanel-demo-btn" title="设置" onClick={handleOpenOptions}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z" />
          </svg>
        </button>
        <button className="octo-sidepanel-demo-btn" title="关闭" onClick={handleClosePanel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="octo-sidepanel-app">
        <App />
      </div>
    </div>
  </React.StrictMode>,
);

browser.runtime.onMessage.addListener((message: ExtensionRuntimeMessage) => {
  if (message.type === EXTENSION_MESSAGE_TYPE.openConversation) {
    void setPendingConversation(message.target).then(() => {
      void consumePendingConversation();
      ensurePendingConversationRetry();
    });
  }
});

void consumePendingConversation();
ensurePendingConversationRetry();
syncSidepanelState(true);
syncSidepanelBadge();
