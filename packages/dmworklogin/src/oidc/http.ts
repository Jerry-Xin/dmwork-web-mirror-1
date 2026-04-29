import type { OidcHttpClient } from './api'

/**
 * OIDC endpoints live at absolute paths like `/v1/...` and must bypass the
 * apiClient baseURL (which is `/api/...`). Use the global fetch.
 */
export const fetchHttpClient: OidcHttpClient = {
  async get<T>(url: string): Promise<T> {
    const resp = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      throw new Error(`HTTP ${resp.status}: ${body || resp.statusText}`)
    }
    return (await resp.json()) as T
  },
}
