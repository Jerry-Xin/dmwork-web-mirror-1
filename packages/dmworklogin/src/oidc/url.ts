import type { SSOProvider } from './types'

const DEFAULT_RETURN_TO = '/login'
// `flag` is forwarded to the backend OIDC callback and recorded on the IM
// device-token row that the WS CONNECT packet later looks up. WuKongIM JS SDK
// hardcodes `deviceFlag = 1` (web), so the authorize call must also send 1 —
// otherwise the IM server can't find the (uid, device_flag, token) tuple at
// connect time and silently closes the socket without a CONNACK.
// Values per WuKongIM: 0 = app, 1 = web, 2 = pc. Mirror the value normal
// password login sends in `user/login` (login_vm.tsx → flag: 1).
const DEFAULT_FLAG = '1'

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
