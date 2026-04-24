import React from 'react';
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
  return (
    <div className="octo-cmdk">
      <div className="octo-cmdk-center">请先在侧边栏登录后再使用 Octo</div>
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
