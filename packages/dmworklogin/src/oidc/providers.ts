import type { SSOProvider } from './types'

export const SSO_PROVIDERS: SSOProvider[] = [
  {
    id: 'aegis',
    name: 'Aegis',
    authorizePath: '/v1/auth/oidc/aegis/authorize',
  },
]

export function getProviderById(id: string): SSOProvider | undefined {
  return SSO_PROVIDERS.find((p) => p.id === id)
}
