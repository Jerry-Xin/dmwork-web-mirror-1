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
  normalizeApiURL,
} from '../../utils/extensionRuntime';
import { getExtensionAuthState } from '../../utils/extensionStorage';
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

// Apply theme synchronously from localStorage (CmdK iframe shares extension origin with sidepanel)
function applyTheme() {
  const theme = localStorage.getItem('octo_v3_theme') || 'paper';
  document.body.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

// Listen for theme changes from sidepanel via storage event
window.addEventListener('storage', (e: StorageEvent) => {
  if (e.key === 'octo_v3_theme' && e.newValue) {
    document.body.setAttribute('data-theme', e.newValue);
    document.documentElement.setAttribute('data-theme', e.newValue);
  }
});

applyTheme();

void ensureAuth().then(() => {
  WKApp.shared.startup();
  const container = document.getElementById('root')!;
  const root = createRoot(container);
  root.render(<CmdKApp />);
});
