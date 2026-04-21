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
  const result = await browser.storage.local.get(
    EXTENSION_STORAGE_KEYS.sidepanelSession,
  );
  const stored = result[EXTENSION_STORAGE_KEYS.sidepanelSession] as
    | SidepanelSessionState
    | undefined;

  return {
    ...DEFAULT_SIDEPANEL_SESSION,
    ...(stored ?? {}),
  };
}

export async function setExtensionSidepanelSession(
  session: SidepanelSessionState,
): Promise<void> {
  await browser.storage.local.set({
    [EXTENSION_STORAGE_KEYS.sidepanelSession]: session,
  });
}

export async function setExtensionSidepanelActive(active: boolean): Promise<void> {
  const current = await getExtensionSidepanelSession();
  await setExtensionSidepanelSession({
    ...current,
    active,
  });
}

export async function setExtensionSidepanelSelectedConversation(
  target: ConversationTarget | null,
): Promise<void> {
  const current = await getExtensionSidepanelSession();
  await setExtensionSidepanelSession({
    ...current,
    selectedTarget: target,
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
