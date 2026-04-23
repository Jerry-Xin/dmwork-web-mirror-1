import type {
  ConversationTarget,
  ExtensionAuthState,
  ExtensionPreferences,
  SidepanelSessionState,
} from "./extensionRuntime";
import {
  DEFAULT_EXTENSION_PREFERENCES,
  EXTENSION_STORAGE_KEYS,
} from "./extensionRuntime";

const DEFAULT_SIDEPANEL_SESSION: SidepanelSessionState = {
  active: false,
  selectedTarget: null,
};

export async function getExtensionAuthState(): Promise<ExtensionAuthState | null> {
  const result = await browser.storage.local.get(EXTENSION_STORAGE_KEYS.authState);
  return (result[EXTENSION_STORAGE_KEYS.authState] as ExtensionAuthState | undefined) ?? null;
}

export async function setExtensionAuthState(auth: ExtensionAuthState): Promise<void> {
  await browser.storage.local.set({
    [EXTENSION_STORAGE_KEYS.authState]: auth,
  });
}

export async function clearExtensionAuthState(): Promise<void> {
  await browser.storage.local.remove(EXTENSION_STORAGE_KEYS.authState);
}

export async function getPendingConversation(): Promise<ConversationTarget | null> {
  const result = await browser.storage.local.get(
    EXTENSION_STORAGE_KEYS.pendingConversation,
  );
  return (
    (result[EXTENSION_STORAGE_KEYS.pendingConversation] as ConversationTarget | undefined) ??
    null
  );
}

export async function setPendingConversation(
  target: ConversationTarget,
): Promise<void> {
  await browser.storage.local.set({
    [EXTENSION_STORAGE_KEYS.pendingConversation]: target,
  });
}

export async function clearPendingConversation(): Promise<void> {
  await browser.storage.local.remove(EXTENSION_STORAGE_KEYS.pendingConversation);
}

export async function getExtensionSidepanelSession(): Promise<SidepanelSessionState> {
  // 读两个独立 key，互不耦合
  const result = await browser.storage.local.get([
    EXTENSION_STORAGE_KEYS.sidepanelActive,
    EXTENSION_STORAGE_KEYS.sidepanelSelectedTarget,
    EXTENSION_STORAGE_KEYS.sidepanelSession,
  ]);
  const activeRaw = result[EXTENSION_STORAGE_KEYS.sidepanelActive] as
    | boolean
    | undefined;
  const targetRaw = result[EXTENSION_STORAGE_KEYS.sidepanelSelectedTarget] as
    | ConversationTarget
    | null
    | undefined;

  // 历史遗留合并对象：只在新 key 均缺失时才回填，写入后不再读这个字段
  const legacy = result[EXTENSION_STORAGE_KEYS.sidepanelSession] as
    | SidepanelSessionState
    | undefined;

  return {
    active:
      activeRaw ?? legacy?.active ?? DEFAULT_SIDEPANEL_SESSION.active,
    selectedTarget:
      targetRaw ?? legacy?.selectedTarget ?? DEFAULT_SIDEPANEL_SESSION.selectedTarget,
  };
}

export async function setExtensionSidepanelActive(active: boolean): Promise<void> {
  // 独立 key 原子写，避免 read-modify-write 被另一 setter 并发覆盖
  await browser.storage.local.set({
    [EXTENSION_STORAGE_KEYS.sidepanelActive]: active,
  });
}

export async function setExtensionSidepanelSelectedConversation(
  target: ConversationTarget | null,
): Promise<void> {
  await browser.storage.local.set({
    [EXTENSION_STORAGE_KEYS.sidepanelSelectedTarget]: target,
  });
}

export async function getExtensionPreferences(): Promise<ExtensionPreferences> {
  const result = await browser.storage.local.get(EXTENSION_STORAGE_KEYS.preferences);
  const stored = result[EXTENSION_STORAGE_KEYS.preferences] as
    | Partial<ExtensionPreferences>
    | undefined;

  return {
    ...DEFAULT_EXTENSION_PREFERENCES,
    ...(stored ?? {}),
  };
}

export async function setExtensionPreferences(
  preferences: ExtensionPreferences,
): Promise<void> {
  await browser.storage.local.set({
    [EXTENSION_STORAGE_KEYS.preferences]: preferences,
  });
}

export const DEFAULT_THEME = 'light';

export async function getExtensionTheme(): Promise<string> {
  const result = await browser.storage.local.get(EXTENSION_STORAGE_KEYS.theme);
  return (result[EXTENSION_STORAGE_KEYS.theme] as string | undefined) ?? DEFAULT_THEME;
}

export async function setExtensionTheme(theme: string): Promise<void> {
  await browser.storage.local.set({
    [EXTENSION_STORAGE_KEYS.theme]: theme,
  });
}
