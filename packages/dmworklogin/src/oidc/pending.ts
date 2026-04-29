import type { PendingOidcLogin } from './types'
import { OIDC_AUTHCODE_TTL_MS } from './types'

const STORAGE_KEY = 'pending_oidc_login'

export function savePendingOidcLogin(value: PendingOidcLogin): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function isPendingOidcLogin(value: unknown): value is PendingOidcLogin {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.providerId === 'string' &&
    v.providerId !== '' &&
    typeof v.authcode === 'string' &&
    v.authcode !== '' &&
    typeof v.savedAt === 'number' &&
    Number.isFinite(v.savedAt)
  )
}

export function getPendingOidcLogin(): PendingOidcLogin | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  return isPendingOidcLogin(parsed) ? parsed : null
}

export function clearPendingOidcLogin(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function isPendingExpired(
  pending: PendingOidcLogin,
  now: number = Date.now(),
): boolean {
  return now - pending.savedAt >= OIDC_AUTHCODE_TTL_MS
}
