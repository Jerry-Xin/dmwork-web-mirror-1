import type { OidcHttpClient } from './api'

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000

function combineSignals(
  external: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  if (!external) return timeout
  // AbortSignal.any merges signals — aborts when any input aborts.
  // Available in modern browsers; vitest jsdom polyfills via undici.
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([external, timeout])
  }
  // Fallback for environments lacking AbortSignal.any.
  const controller = new AbortController()
  const onAbort = (s: AbortSignal) => () => controller.abort(s.reason)
  if (external.aborted) controller.abort(external.reason)
  else external.addEventListener('abort', onAbort(external), { once: true })
  if (timeout.aborted) controller.abort(timeout.reason)
  else timeout.addEventListener('abort', onAbort(timeout), { once: true })
  return controller.signal
}

/**
 * OIDC endpoints live at absolute paths like `/v1/...` and must bypass the
 * apiClient baseURL (which is `/api/...`). Use the global fetch.
 *
 * Each request is wrapped in a 10s timeout, ORed with an optional caller
 * signal so cancellation aborts the in-flight request immediately.
 */
export const fetchHttpClient: OidcHttpClient = {
  async get<T>(url: string, init?: { signal?: AbortSignal }): Promise<T> {
    const signal = combineSignals(init?.signal, DEFAULT_REQUEST_TIMEOUT_MS)
    const resp = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal,
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      throw new Error(`HTTP ${resp.status}: ${body || resp.statusText}`)
    }
    return (await resp.json()) as T
  },
}
