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
import { FileContent } from '@dmwork/base/src/Messages/File/FileContent';
import ConversationVM from '@dmwork/base/src/Components/Conversation/vm';
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
  type CocraftDispatchMessage,
} from '../../utils/extensionRuntime';
import {
  parseCocraftMessage,
  isCocraftToolResultMessage,
  cocraftLog,
} from '../../utils/cocraft';
import {
  clearPendingConversation,
  getPendingConversation,
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
// 由 APIClient request interceptor 读取当前 space_id，注入 X-Space-Id header。GH #1038
WKApp.apiClient.config.spaceIdCallback = () => WKApp.shared.currentSpaceId;
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

const spaceCheckIntervalId = window.setInterval(() => {
  const currentSpaceId = localStorage.getItem('currentSpaceId') || '';
  if (currentSpaceId === lastSyncedSpaceId) {
    return;
  }
  lastSyncedSpaceId = currentSpaceId;
  void syncExtensionAuthStateFromWKApp(apiURL);
  syncSidepanelBadge();
}, 1000);

window.addEventListener('pagehide', () => {
  window.clearInterval(spaceCheckIntervalId);
  stopPendingConversationRetry();
});

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

// --- CoCraft 消息过滤 & 转发 hook ---

cocraftLog.divider('sidepanel', '初始化 CoCraft 消息拦截');

function dispatchCocraftToBackground(channel: { channelID: string; channelType: number }, parsed: { uagt: string; rawMessage: string }) {
  cocraftLog.step('sidepanel', 'DISPATCH', `发送 COCRAFT_DISPATCH → background`, {
    channelId: channel.channelID,
    channelType: channel.channelType,
    uagt: parsed.uagt,
    rawMsgLen: parsed.rawMessage.length,
  });
  void browser.runtime.sendMessage({
    type: EXTENSION_MESSAGE_TYPE.cocraftDispatch,
    channelId: channel.channelID,
    channelType: channel.channelType,
    uagt: parsed.uagt,
    rawMessage: parsed.rawMessage,
  } satisfies CocraftDispatchMessage).catch((err: unknown) => {
    cocraftLog.err('sidepanel', 'DISPATCH', 'runtime.sendMessage 失败', err);
  });
}

const origAddMessageListener = WKSDK.shared().chatManager.addMessageListener.bind(WKSDK.shared().chatManager);
const origRemoveMessageListener = WKSDK.shared().chatManager.removeMessageListener.bind(WKSDK.shared().chatManager);
cocraftLog.ok('sidepanel', 'HOOK', 'addMessageListener / removeMessageListener 已包装');
// WeakMap: 原始 listener → wrapped listener。让 removeMessageListener 能反查 wrapper，避免 SDK 的 === 比较找不到而泄漏。
const _listenerWrappers = new WeakMap<(msg: any) => void, (msg: any) => void>();
const _dispatchedMsgIds = new Set<string>();
WKSDK.shared().chatManager.addMessageListener = (listener: (msg: any) => void) => {
  if (_listenerWrappers.has(listener)) {
    cocraftLog.warn('sidepanel', 'HOOK', '同一 messageListener 重复注册 → 跳过（幂等）');
    return;
  }
  cocraftLog.step('sidepanel', 'HOOK', '有组件注册了 messageListener');
  const wrapped = (message: any) => {
    const text: string = message.content?.text || '';
    cocraftLog.step('sidepanel', '收到消息', `contentType=${message.contentType} textLen=${text.length}`, text);
    if (isCocraftToolResultMessage(text)) {
      cocraftLog.warn('sidepanel', '过滤', '检测到 tool_results → 隐藏此消息，不渲染');
      return;
    }
    if (message.contentType === 8 && message.content?.name?.startsWith('cocraft-result-')) {
      cocraftLog.warn('sidepanel', '过滤', `检测到 cocraft 附件 ${message.content.name} → 隐藏`);
      return;
    }
    const parsed = parseCocraftMessage(text);
    if (parsed) {
      cocraftLog.ok('sidepanel', '解析', `<cocraft> 解析成功`, {
        uagt: parsed.uagt,
        displayContent: parsed.content,
        hasActions: parsed.hasActions,
      });
      if (message.content) message.content.text = parsed.content;
      if (parsed.hasActions) {
        const msgId: string = message.messageID || message.clientMsgNo || '';
        if (msgId && _dispatchedMsgIds.has(msgId)) {
          cocraftLog.warn('sidepanel', 'ACTIONS', `消息 ${msgId} 已 dispatch 过 → 跳过重复`);
        } else {
          if (msgId) _dispatchedMsgIds.add(msgId);
          cocraftLog.step('sidepanel', 'ACTIONS', '包含 actions → 转发给 background 处理');
          dispatchCocraftToBackground(message.channel, parsed);
        }
      }
    }
    listener(message);
  };
  _listenerWrappers.set(listener, wrapped);
  return origAddMessageListener(wrapped);
};
WKSDK.shared().chatManager.removeMessageListener = (listener: (msg: any) => void) => {
  const wrapped = _listenerWrappers.get(listener);
  if (wrapped) {
    _listenerWrappers.delete(listener);
    cocraftLog.step('sidepanel', 'HOOK', '移除 messageListener（反查 wrapper）');
    return origRemoveMessageListener(wrapped);
  }
  // 未通过包装过的 addMessageListener 注册过 —— 直接透传
  return origRemoveMessageListener(listener);
};

const origRefreshMessages = ConversationVM.prototype.refreshMessages;
cocraftLog.ok('sidepanel', 'HOOK', 'refreshMessages 已包装');
(ConversationVM.prototype as any).refreshMessages = function(messages: any[], callback?: () => void, options?: any) {
  cocraftLog.step('sidepanel', '历史消息', `refreshMessages 调用, 消息数=${messages.length}`);
  let toolResultCount = 0;
  let cocraftCount = 0;
  const filtered = messages.filter((m: any) => {
    const text: string = m.content?.text || '';
    if (isCocraftToolResultMessage(text)) {
      toolResultCount++;
      return false;
    }
    if (m.contentType === 8 && m.content?.name?.startsWith('cocraft-result-')) {
      toolResultCount++;
      return false;
    }
    return true;
  });
  for (const m of filtered) {
    const text: string = m.content?.text || '';
    const parsed = parseCocraftMessage(text);
    if (parsed && m.content) {
      cocraftCount++;
      m.content.text = parsed.content;
    }
  }
  if (toolResultCount > 0 || cocraftCount > 0) {
    cocraftLog.ok('sidepanel', '历史消息', `处理完成: 过滤 ${toolResultCount} 条 tool_results, 替换 ${cocraftCount} 条 <cocraft> 显示文本`);
  }
  return origRefreshMessages.call(this, filtered, callback, options);
};

// --- end CoCraft hook ---

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
    void openConversation(message.target);
  }

  if (message.type === EXTENSION_MESSAGE_TYPE.getActiveConversation) {
    const channel = WKApp.shared.openChannel;
    const target = channel
      ? { channelId: channel.channelID, channelType: channel.channelType }
      : null;
    console.log("[Sidepanel] getActiveConversation: openChannel=", channel?.channelID, "type=", channel?.channelType, "returning:", JSON.stringify(target));
    return Promise.resolve({ target });
  }

  if (message.type === EXTENSION_MESSAGE_TYPE.cocraftResult) {
    cocraftLog.divider('sidepanel', '收到 COCRAFT_RESULT');
    cocraftLog.step('sidepanel', 'RESULT', `success=${message.success}`, {
      channelId: message.channelId,
      channelType: message.channelType,
      error: message.error,
      toolResultMsgLen: message.toolResultMessage?.length,
    });
    if (message.toolResultMessage && message.channelId) {
      cocraftLog.step('sidepanel', '回传', `发送 toolResultMessage 到 IM (len=${message.toolResultMessage.length})`, message.toolResultMessage);
      const fileName = `cocraft-result-${Date.now()}.md`;
      const blob = new Blob([message.toolResultMessage], { type: 'text/markdown' });
      const file = new File([blob], fileName, { type: 'text/markdown' });
      const content = new FileContent(file, fileName, 'md', file.size);
      const channel = new Channel(message.channelId, message.channelType);
      WKSDK.shared().chatManager.send(content, channel);
      cocraftLog.ok('sidepanel', '回传', `chatManager.send() 已调用 → tool_results 以 .md 附件发往 IM 后端 (${fileName})`);
    }
    if (!message.success && message.error) {
      cocraftLog.err('sidepanel', 'RESULT', `CoCraft action 执行失败: ${message.error}`);
    }
  }
});

ensurePendingConversationRetry();
void consumePendingConversation();
syncSidepanelState(true);
syncSidepanelBadge();
