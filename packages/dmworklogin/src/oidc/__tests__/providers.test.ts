import { describe, it, expect } from 'vitest'
import { SSO_PROVIDERS, getProviderById } from '../providers'

describe('SSO_PROVIDERS', () => {
  it('contains the aegis provider', () => {
    const aegis = SSO_PROVIDERS.find((p) => p.id === 'aegis')
    expect(aegis).toBeDefined()
    expect(aegis?.name).toMatch(/aegis/i)
    expect(aegis?.authorizePath).toBe('/v1/auth/oidc/aegis/authorize')
  })

  it('all entries have required fields', () => {
    for (const p of SSO_PROVIDERS) {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.authorizePath.startsWith('/')).toBe(true)
    }
  })

  it('has unique ids', () => {
    const ids = SSO_PROVIDERS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getProviderById', () => {
  it('returns the provider when id matches', () => {
    const result = getProviderById('aegis')
    expect(result?.id).toBe('aegis')
  })

  it('returns undefined when id does not match', () => {
    expect(getProviderById('nonexistent')).toBeUndefined()
  })
})
