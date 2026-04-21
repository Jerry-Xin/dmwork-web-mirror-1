import { WKApp } from "@dmwork/base";
import {
  EXTENSION_MESSAGE_TYPE,
  normalizeApiURL,
  type ExtensionAuthState,
  type ExtensionRuntimeMessage,
} from "./extensionRuntime";
import {
  clearExtensionAuthState,
  clearPendingConversation,
  getExtensionAuthState,
  setExtensionAuthState,
} from "./extensionStorage";

function getCurrentSpaceId(): string {
  return localStorage.getItem("currentSpaceId") || "";
}

async function sendRuntimeMessage(
  message: ExtensionRuntimeMessage,
): Promise<void> {
  await browser.runtime.sendMessage(message).catch(() => {});
}

export function applyExtensionAuthToWKApp(auth: ExtensionAuthState): void {
  WKApp.loginInfo.uid = auth.uid;
  WKApp.loginInfo.token = auth.token;
  WKApp.loginInfo.save();
  WKApp.apiClient.config.apiURL = normalizeApiURL(auth.apiURL);
  WKApp.apiClient.config.tokenCallback = () => WKApp.loginInfo.token;

  const currentSpaceId = auth.currentSpaceId || getCurrentSpaceId();
  WKApp.shared.currentSpaceId = currentSpaceId;
  if (currentSpaceId) {
    localStorage.setItem("currentSpaceId", currentSpaceId);
  } else {
    localStorage.removeItem("currentSpaceId");
  }
}

export async function hydrateWKAppFromExtensionAuth(): Promise<ExtensionAuthState | null> {
  if (WKApp.loginInfo.isLogined()) {
    return {
      loggedIn: true,
      uid: WKApp.loginInfo.uid || "",
      token: WKApp.loginInfo.token || "",
      apiURL: normalizeApiURL(WKApp.apiClient.config.apiURL),
      currentSpaceId: getCurrentSpaceId(),
    };
  }

  const auth = await getExtensionAuthState();
  if (!auth?.loggedIn || !auth.token) {
    return null;
  }

  applyExtensionAuthToWKApp(auth);
  return auth;
}

export function getExtensionAuthSnapshot(apiURL: string): ExtensionAuthState {
  return {
    loggedIn: WKApp.loginInfo.isLogined(),
    uid: WKApp.loginInfo.uid || "",
    token: WKApp.loginInfo.token || "",
    apiURL: normalizeApiURL(apiURL || WKApp.apiClient.config.apiURL),
    currentSpaceId: getCurrentSpaceId(),
  };
}

export async function syncExtensionAuthStateFromWKApp(
  apiURL: string,
): Promise<void> {
  const auth = getExtensionAuthSnapshot(apiURL);
  if (auth.loggedIn && auth.token) {
    await setExtensionAuthState(auth);
    await sendRuntimeMessage({
      type: EXTENSION_MESSAGE_TYPE.authChanged,
      auth,
    });
    return;
  }

  await clearExtensionAuthState();
  await sendRuntimeMessage({
    type: EXTENSION_MESSAGE_TYPE.authCleared,
  });
  await sendRuntimeMessage({
    type: EXTENSION_MESSAGE_TYPE.sidepanelBadgeSync,
    hasUnread: false,
  });
}

export function clearWKAppSessionState(): void {
  WKApp.loginInfo.logout();
  localStorage.removeItem("currentSpaceId");
  WKApp.shared.currentSpaceId = "";
  WKApp.shared.spaceChecked = false;
  WKApp.apiClient.config.tokenCallback = () => WKApp.loginInfo.token;
}

interface InstallLogoutBridgeOptions {
  onLoggedOut?: () => void;
  useOriginalLogout?: boolean;
}

export function installExtensionLogoutBridge(
  options: InstallLogoutBridgeOptions = {},
): void {
  const { onLoggedOut, useOriginalLogout = true } = options;
  const originalLogout = WKApp.shared.logout.bind(WKApp.shared);

  WKApp.shared.logout = () => {
    void clearPendingConversation()
      .then(() => clearExtensionAuthState())
      .then(() =>
        sendRuntimeMessage({
          type: EXTENSION_MESSAGE_TYPE.authCleared,
        }),
      )
      .then(() =>
        sendRuntimeMessage({
          type: EXTENSION_MESSAGE_TYPE.sidepanelBadgeSync,
          hasUnread: false,
        }),
      )
      .finally(() => {
        if (useOriginalLogout) {
          originalLogout();
          return;
        }

        clearWKAppSessionState();
        onLoggedOut?.();
      });
  };
}

interface RegisterAuthRuntimeSyncOptions {
  onAuthChanged?: (auth: ExtensionAuthState) => void;
  onAuthCleared?: () => void;
}

export function registerExtensionAuthRuntimeSync(
  options: RegisterAuthRuntimeSyncOptions = {},
): () => void {
  const listener = (message: ExtensionRuntimeMessage) => {
    if (message.type === EXTENSION_MESSAGE_TYPE.authChanged) {
      applyExtensionAuthToWKApp(message.auth);
      options.onAuthChanged?.(message.auth);
      return;
    }

    if (message.type === EXTENSION_MESSAGE_TYPE.authCleared) {
      clearWKAppSessionState();
      options.onAuthCleared?.();
    }
  };

  browser.runtime.onMessage.addListener(listener);
  return () => {
    browser.runtime.onMessage.removeListener(listener);
  };
}
