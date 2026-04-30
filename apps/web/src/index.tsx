import React from 'react';
import { createRoot } from 'react-dom/client';
import '@dmwork/base/src/theme/tokens.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import  { BaseModule, WKApp } from '@dmwork/base';
import  { LoginModule } from '@dmwork/login';
import  { DataSourceModule } from '@dmwork/datasource';
import {ContactsModule} from '@dmwork/contacts';
import { TodoModule } from '@dmwork/todo';
import { version as pkgVersion } from '../package.json';

// VITE_API_URL 只填 origin（协议+域名+端口），不要带路径
// 例如: https://im.deepminer.com.cn (而非 https://im.deepminer.com.cn/v1/)

if((window as any).__TAURI_IPC__ || (window as any)?.__POWERED_ELECTRON__) {
  // Tauri/Electron 需要完整 API URL
  const rawApiURL = import.meta.env.VITE_API_URL
  if (!rawApiURL) {
    throw new Error('VITE_API_URL is required for Tauri/Electron. Please set it in .env.local (e.g., VITE_API_URL=https://im.deepminer.com.cn)')
  }
  // 提取 origin，防止旧格式导致双拼路径
  let apiURL: string
  try {
    apiURL = new URL(rawApiURL).origin
  } catch {
    throw new Error(`VITE_API_URL format is invalid: "${rawApiURL}". Please use full URL, e.g. https://im.deepminer.com.cn`)
  }
  WKApp.apiClient.config.apiURL = apiURL + "/v1/"
} else {
  // Web 环境（DEV/PROD）统一走相对路径 /api/v1/
  // DEV: 由 Vite proxy 转发到 VITE_API_URL（保留 /api 前缀，后端直连）
  // PROD: 由 Nginx 反代到实际后端（Nginx 剥离 /api 前缀）
  WKApp.apiClient.config.apiURL = "/api/v1/"
}

WKApp.apiClient.config.tokenCallback = ()=> {
  return WKApp.loginInfo.token
}
// 由 APIClient request interceptor 读取当前 space_id，注入 X-Space-Id header。
// 通过回调注入（而非在 APIClient 内 import WKApp）以避免循环依赖。GH #1038
WKApp.apiClient.config.spaceIdCallback = () => {
  return WKApp.shared.currentSpaceId
}
WKApp.config.appVersion = import.meta.env.VITE_VERSION || pkgVersion
WKApp.config.appName = "Octo"

WKApp.loginInfo.load() // 加载登录信息

WKApp.shared.registerModule(new BaseModule()); // 基础模块
WKApp.shared.registerModule(new DataSourceModule()) // 数据源模块
WKApp.shared.registerModule(new LoginModule()); // 登录模块
WKApp.shared.registerModule(new ContactsModule()); // 联系模块
WKApp.shared.registerModule(new TodoModule()); // Todo module

WKApp.shared.startup() // app启动

// Initialize Electron notification bridge if running in Electron

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
reportWebVitals();

