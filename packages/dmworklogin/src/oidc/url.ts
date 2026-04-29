import type { SSOProvider } from './types'

const DEFAULT_RETURN_TO = '/login'
// Backend `config.DeviceFlag` value: 0 = APP. The web build maps to APP for
// the OIDC authorize call because the IdP only differentiates by device class
// for token issuance, not by browser-vs-native.
const DEFAULT_FLAG = '0'

export function buildAuthorizeURL(
  provider: SSOProvider,
  authcode: string,
  returnTo: string = DEFAULT_RETURN_TO,
): string {
  const params = new URLSearchParams()
  params.set('authcode', authcode)
  params.set('return_to', returnTo)
  params.set('flag', DEFAULT_FLAG)
  return `${provider.authorizePath}?${params.toString()}`
}

export interface OidcUrlState {
  error: boolean
}

export function parseOidcUrlState(search: string): OidcUrlState {
  const normalized = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(normalized)
  return { error: params.get('oidc_error') === '1' }
}
