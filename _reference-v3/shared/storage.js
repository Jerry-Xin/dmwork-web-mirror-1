import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants.js'

export async function getAuth() {
  const res = await chrome.storage.local.get([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.SETTINGS])
  const token = res[STORAGE_KEYS.TOKEN]
  const user = res[STORAGE_KEYS.USER]
  const settings = res[STORAGE_KEYS.SETTINGS] ?? DEFAULT_SETTINGS
  if (!token || !user) return null
  return { token, user, apiUrl: settings.apiUrl }
}

export async function setAuth(token, user) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.TOKEN]: token,
    [STORAGE_KEYS.USER]: user,
  })
}

export async function clearAuth() {
  await chrome.storage.local.remove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER])
}

export async function getSettings() {
  const res = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS)
  return { ...DEFAULT_SETTINGS, ...(res[STORAGE_KEYS.SETTINGS] || {}) }
}

export async function setSettings(patch) {
  const current = await getSettings()
  const merged = { ...current, ...patch }
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged })
  return merged
}

export async function getCurrentThreadId() {
  const res = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_THREAD)
  return res[STORAGE_KEYS.CURRENT_THREAD] ?? null
}

export async function setCurrentThreadId(channelId) {
  if (channelId === null) {
    await chrome.storage.local.remove(STORAGE_KEYS.CURRENT_THREAD)
  } else {
    await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_THREAD]: channelId })
  }
}
