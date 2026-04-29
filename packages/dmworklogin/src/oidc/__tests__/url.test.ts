import { describe, it, expect } from 'vitest'
import { buildAuthorizeURL, parseOidcUrlState } from '../url'
import type { SSOProvider } from '../types'

const aegis: SSOProvider = {
  id: 'aegis',
  name: 'Aegis',
  authorizePath: '/v1/auth/oidc/aegis/authorize',
}

describe('buildAuthorizeURL', () => {
  it('includes authcode and default return_to=/login and flag=0', () => {
    const url = buildAuthorizeURL(aegis, 'abc123')
    expect(url.startsWith('/v1/auth/oidc/aegis/authorize?')).toBe(true)
    const qs = new URLSearchParams(url.split('?')[1])
    expect(qs.get('authcode')).toBe('abc123')
    expect(qs.get('return_to')).toBe('/login')
    expect(qs.get('flag')).toBe('0')
  })

  it('uses custom return_to when provided', () => {
    const url = buildAuthorizeURL(aegis, 'abc', '/login?next=/home')
    const qs = new URLSearchParams(url.split('?')[1])
    expect(qs.get('return_to')).toBe('/login?next=/home')
  })

  it('encodes special characters in authcode', () => {
    const url = buildAuthorizeURL(aegis, 'a b&c')
    expect(url).toContain('authcode=a+b%26c')
  })
})

describe('parseOidcUrlState', () => {
  it('detects oidc_error=1', () => {
    expect(parseOidcUrlState('?oidc_error=1').error).toBe(true)
    expect(parseOidcUrlState('foo=bar&oidc_error=1').error).toBe(true)
  })

  it('returns error=false for clean query', () => {
    expect(parseOidcUrlState('').error).toBe(false)
    expect(parseOidcUrlState('?foo=bar').error).toBe(false)
  })

  it('treats oidc_error=0 or missing as no error', () => {
    expect(parseOidcUrlState('?oidc_error=0').error).toBe(false)
  })
})
