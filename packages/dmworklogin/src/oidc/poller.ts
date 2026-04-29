import { fetchAuthStatus, type AuthStatusResponse, type OidcHttpClient } from './api'
import { OIDC_AUTH_STATUS } from './types'

export interface PollAuthStatusOptions {
  client: OidcHttpClient
  authcode: string
  intervalMs: number
  maxAttempts: number
  sleep: (ms: number) => Promise<void>
  isCancelled?: () => boolean
  // Tolerated consecutive transient network errors before giving up.
  // Defaults to 10 to mirror the QR-code poller in login_vm.tsx.
  maxConsecutiveErrors?: number
}

const DEFAULT_MAX_CONSECUTIVE_ERRORS = 10

export class OidcPollTimeoutError extends Error {
  constructor() {
    super('OIDC login polling timed out')
    this.name = 'OidcPollTimeoutError'
  }
}

export class OidcPollCancelledError extends Error {
  constructor() {
    super('OIDC login polling cancelled')
    this.name = 'OidcPollCancelledError'
  }
}

export class OidcPollNetworkError extends Error {
  constructor(public readonly cause: unknown) {
    super('OIDC login polling failed after repeated network errors')
    this.name = 'OidcPollNetworkError'
  }
}

export async function pollAuthStatus(
  opts: PollAuthStatusOptions,
): Promise<AuthStatusResponse> {
  const maxErrors = opts.maxConsecutiveErrors ?? DEFAULT_MAX_CONSECUTIVE_ERRORS
  let consecutiveErrors = 0
  let lastError: unknown
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    if (opts.isCancelled?.()) throw new OidcPollCancelledError()
    try {
      const resp = await fetchAuthStatus(opts.client, opts.authcode)
      consecutiveErrors = 0
      if (
        resp.status === OIDC_AUTH_STATUS.SUCCESS ||
        resp.status === OIDC_AUTH_STATUS.FAILED
      ) {
        return resp
      }
    } catch (err) {
      consecutiveErrors++
      lastError = err
      if (consecutiveErrors >= maxErrors) {
        throw new OidcPollNetworkError(lastError)
      }
    }
    if (attempt < opts.maxAttempts - 1) {
      await opts.sleep(opts.intervalMs)
    }
  }
  throw new OidcPollTimeoutError()
}
