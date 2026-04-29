export interface SSOProvider {
  id: string
  name: string
  authorizePath: string
}

export interface PendingOidcLogin {
  providerId: string
  authcode: string
  savedAt: number
}

export const OIDC_AUTHCODE_TTL_MS = 5 * 60 * 1000

export const OIDC_AUTH_STATUS = {
  PENDING: 0,
  SUCCESS: 1,
  FAILED: 2,
} as const

export type OidcAuthStatus =
  (typeof OIDC_AUTH_STATUS)[keyof typeof OIDC_AUTH_STATUS]
