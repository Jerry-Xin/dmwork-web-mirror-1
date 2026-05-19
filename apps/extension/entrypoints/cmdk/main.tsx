import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import '@dmwork/base/src/theme/tokens.css';
import '../sidepanel/style.css';
import './style.css';
import { BaseModule, WKApp } from '@dmwork/base';
import StorageService from '@dmwork/base/src/Service/StorageService';
import { LoginModule } from '@dmwork/login';
import { DataSourceModule } from '@dmwork/datasource';
import { ContactsModule } from '@dmwork/contacts';
import { version as pkgVersion } from '../../../web/package.json';
import {
  DEFAULT_API_URL,
  EXTENSION_MESSAGE_TYPE,
  EXTENSION_STORAGE_KEYS,
  normalizeApiURL,
} from '../../utils/extensionRuntime';
import {
  hydrateWKAppFromExtensionAuth,
  installExtensionLogoutBridge,
  registerExtensionAuthRuntimeSync,
} from '../../utils/extensionAuthSession';
import CmdKApp from './CmdKApp';

(window as any).__POWERED_EXTENSION__ = true;
document.body.classList.add('octo-sidepanel-v3');

StorageService.shared.setItem = (key, value) => localStorage.setItem(key, value);
StorageService.shared.getItem = (key) => localStorage.getItem(key);
StorageService.shared.removeItem = (key) => localStorage.removeItem(key);

const apiURL = normalizeApiURL(DEFAULT_API_URL);
WKApp.apiClient.config.apiURL = apiURL;
WKApp.apiClient.config.tokenCallback = () => WKApp.loginInfo.token;
// Scope API requests to the current space for multi-space data isolation
WKApp.apiClient.config.spaceIdCallback = () => WKApp.shared.currentSpaceId;
WKApp.config.appVersion = pkgVersion;
WKApp.config.appName = 'Octo';
WKApp.shared.currentSpaceId = localStorage.getItem('currentSpaceId') || '';

WKApp.loginInfo.load();
installExtensionLogoutBridge({
  useOriginalLogout: false,
  onLoggedOut: () => {
    try {
      window.close();
      return;
    } catch {
      window.location.reload();
    }
  },
});

WKApp.shared.registerModule(new BaseModule());
WKApp.shared.registerModule(new DataSourceModule());
WKApp.shared.registerModule(new LoginModule());
WKApp.shared.registerModule(new ContactsModule());

async function ensureAuth(): Promise<boolean> {
  if (WKApp.loginInfo.isLogined()) return true;

  const auth = await hydrateWKAppFromExtensionAuth();
  return !!auth?.loggedIn;
}

// Apply theme from extension storage (not localStorage — iframe origin ≠ extension origin)
// Aligned with web client: use body[theme-mode=dark]
function setThemeAttr(theme: string) {
  if (theme === 'dark') {
    document.body.setAttribute('theme-mode', 'dark');
  } else {
    document.body.removeAttribute('theme-mode');
  }
}

// Fire-and-forget: read theme from browser.storage.local, won't block render
void browser.storage.local.get(EXTENSION_STORAGE_KEYS.theme).then((result: Record<string, unknown>) => {
  const theme = (result[EXTENSION_STORAGE_KEYS.theme] as string) || 'light';
  setThemeAttr(theme);
}).catch(() => { /* ignore — default light theme is fine */ });

// Listen for real-time theme changes from sidepanel
browser.storage.onChanged.addListener((
  changes: Record<string, { newValue?: unknown }>,
  areaName: string,
) => {
  if (areaName === 'local' && changes[EXTENSION_STORAGE_KEYS.theme]) {
    const newTheme = (changes[EXTENSION_STORAGE_KEYS.theme].newValue as string) || 'light';
    setThemeAttr(newTheme);
  }
});

const disposeAuthSync = registerExtensionAuthRuntimeSync({
  onAuthCleared: () => {
    try {
      window.close();
    } catch {
      window.location.reload();
    }
  },
});

window.addEventListener('beforeunload', () => {
  disposeAuthSync();
});

function LoggedOutNotice() {
  const parentOriginRef = useRef<string | null>(null);

  const notifyClose = (reason: string) => {
    const target = parentOriginRef.current ?? '*';
    window.parent.postMessage({ type: 'CMDK_CLOSE', reason }, target);
  };

  useEffect(() => {
    // 握手：捕获 parent 的真实 origin，关闭时定向 postMessage 避免泄漏
    const onMessage = (e: MessageEvent) => {
      if (e.source === window.parent && e.origin) {
        parentOriginRef.current = e.origin;
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') notifyClose('escape');
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKey);
    window.parent.postMessage({ type: 'CMDK_READY' }, '*');
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleOpenSidePanel = () => {
    void browser.runtime
      .sendMessage({ type: EXTENSION_MESSAGE_TYPE.requestOpenSidePanel })
      .catch(() => {});
    notifyClose('open-side-panel');
  };

  const handleDismiss = () => notifyClose('cancel');

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      notifyClose('cancel');
    }
  };

  return (
    <div className="octo-cmdk" onMouseDown={handleOverlayMouseDown}>
      <div
        className="octo-cmdk-empty-card"
        role="dialog"
        aria-labelledby="octo-cmdk-empty-title"
      >
        <div className="octo-cmdk-empty-glow" aria-hidden />

        <h2 className="octo-cmdk-empty-title" id="octo-cmdk-empty-title">
          请先登录
        </h2>
        <p className="octo-cmdk-empty-desc">登录后即可使用 Octo 划词功能。</p>

        <div className="octo-cmdk-empty-actions">
          <button
            type="button"
            className="octo-cmdk-empty-cta"
            onClick={handleOpenSidePanel}
            autoFocus
          >
            <span>打开侧边栏登录</span>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
              <path
                d="M3 8h10m0 0L9 4m4 4L9 12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
          <button
            type="button"
            className="octo-cmdk-empty-ghost"
            onClick={handleDismiss}
          >
            稍后
          </button>
        </div>

        <div className="octo-cmdk-empty-foot">
          <span className="octo-cmdk-empty-kbd">Esc</span>
          <span>关闭</span>
        </div>
      </div>
    </div>
  );
}

void ensureAuth().then((authed) => {
  const container = document.getElementById('root')!;
  const root = createRoot(container);
  if (authed) {
    WKApp.shared.startup();
    root.render(<CmdKApp />);
  } else {
    root.render(<LoggedOutNotice />);
  }
});
