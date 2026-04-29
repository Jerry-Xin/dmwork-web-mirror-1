import { describe, it, expect, beforeEach } from 'vitest'
import {
  savePendingOidcLogin,
  getPendingOidcLogin,
  clearPendingOidcLogin,
  isPendingExpired,
} from '../pending'
import { OIDC_AUTHCODE_TTL_MS } from '../types'

describe('pending oidc login (sessionStorage)', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('save then get returns the same value', () => {
    const value = { providerId: 'aegis', authcode: 'abc', savedAt: 1000 }
    savePendingOidcLogin(value)
    expect(getPendingOidcLogin()).toEqual(value)
  })

  it('returns null when nothing is saved', () => {
    expect(getPendingOidcLogin()).toBeNull()
  })

  it('returns null when stored value is corrupt JSON', () => {
    sessionStorage.setItem('pending_oidc_login', '{not json')
    expect(getPendingOidcLogin()).toBeNull()
  })

  it('clear removes the value', () => {
    savePendingOidcLogin({ providerId: 'aegis', authcode: 'abc', savedAt: 1 })
    clearPendingOidcLogin()
    expect(getPendingOidcLogin()).toBeNull()
  })

  it('returns null when stored value has missing required field', () => {
    sessionStorage.setItem(
      'pending_oidc_login',
      JSON.stringify({ providerId: 'aegis', authcode: '' }),
    )
    expect(getPendingOidcLogin()).toBeNull()
  })

  it('returns null when stored savedAt is non-numeric', () => {
    sessionStorage.setItem(
      'pending_oidc_login',
      JSON.stringify({ providerId: 'aegis', authcode: 'x', savedAt: 'soon' }),
    )
    expect(getPendingOidcLogin()).toBeNull()
  })

  it('returns null when stored value is an array', () => {
    sessionStorage.setItem('pending_oidc_login', JSON.stringify([1, 2, 3]))
    expect(getPendingOidcLogin()).toBeNull()
  })
})

describe('isPendingExpired', () => {
  it('returns false within TTL', () => {
    const pending = { providerId: 'aegis', authcode: 'abc', savedAt: 1000 }
    expect(isPendingExpired(pending, 1000 + OIDC_AUTHCODE_TTL_MS - 1)).toBe(false)
  })

  it('returns true at or beyond TTL', () => {
    const pending = { providerId: 'aegis', authcode: 'abc', savedAt: 1000 }
    expect(isPendingExpired(pending, 1000 + OIDC_AUTHCODE_TTL_MS)).toBe(true)
    expect(isPendingExpired(pending, 1000 + OIDC_AUTHCODE_TTL_MS + 1000)).toBe(true)
  })

  it('uses Date.now when now arg is omitted', () => {
    const pending = { providerId: 'aegis', authcode: 'abc', savedAt: Date.now() }
    expect(isPendingExpired(pending)).toBe(false)
  })
})
