import React from 'react';
import { createRoot } from 'react-dom/client';
import '@dmwork/base/src/theme/tokens.css';
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
import { getExtensionAuthState, getExtensionTheme } from '../../utils/extensionStorage';
import CmdKApp from './CmdKApp';

(window as any).__POWERED_EXTENSION__ = true;

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

WKApp.shared.registerModule(new BaseModule());
WKApp.shared.registerModule(new DataSourceModule());
WKApp.shared.registerModule(new LoginModule());
WKApp.shared.registerModule(new ContactsModule());

async function ensureAuth(): Promise<void> {
  if (WKApp.loginInfo.isLogined()) return;

  const auth = await getExtensionAuthState();
  if (auth?.loggedIn && auth.token) {
    WKApp.loginInfo.uid = auth.uid;
    WKApp.loginInfo.token = auth.token;
    WKApp.loginInfo.save();
    WKApp.apiClient.config.apiURL = normalizeApiURL(auth.apiURL);
    WKApp.apiClient.config.tokenCallback = () => auth.token;
    WKApp.shared.currentSpaceId = auth.currentSpaceId || localStorage.getItem('currentSpaceId') || '';
    if (auth.currentSpaceId) {
      localStorage.setItem('currentSpaceId', auth.currentSpaceId);
    }
  }
}

async function applyTheme(): Promise<void> {
  const theme = await getExtensionTheme();
  document.body.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

// Listen for theme changes from sidepanel
browser.storage.onChanged.addListener(
  (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, areaName: string) => {
    if (areaName === 'local' && changes[EXTENSION_STORAGE_KEYS.theme]) {
      const newTheme = (changes[EXTENSION_STORAGE_KEYS.theme].newValue as string) || 'paper';
      document.body.setAttribute('data-theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  },
);

void Promise.all([ensureAuth(), applyTheme()]).then(() => {
  WKApp.shared.startup();
  const container = document.getElementById('root')!;
  const root = createRoot(container);
  root.render(<CmdKApp />);
});
