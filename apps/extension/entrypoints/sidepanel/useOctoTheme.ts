/**
 * useOctoTheme — theme/layout state management with localStorage persistence
 *
 * Keys:
 *   theme-mode     → '0' (light) | '1' (dark) — aligned with web client
 *   octo_v3_layout → 'message' | 'cli'
 *
 * Applies theme-mode attribute to <body> (same as web client).
 */

import { useState, useCallback, useEffect } from 'react'

export type OctoTheme = 'light' | 'dark'
export type OctoLayout = 'message' | 'cli'

const THEME_KEY = 'theme-mode'
const LAYOUT_KEY = 'octo_v3_layout'
const DEFAULT_THEME: OctoTheme = 'light'
const DEFAULT_LAYOUT: OctoLayout = 'cli'

function readTheme(): OctoTheme {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === '1') return 'dark'
  } catch { /* noop */ }
  return DEFAULT_THEME
}

function readLayout(): OctoLayout {
  try {
    const v = localStorage.getItem(LAYOUT_KEY)
    if (v === 'message' || v === 'cli') return v
  } catch { /* noop */ }
  return DEFAULT_LAYOUT
}

function applyTheme(theme: OctoTheme): void {
  if (theme === 'dark') {
    document.body.setAttribute('theme-mode', 'dark')
  } else {
    document.body.removeAttribute('theme-mode')
  }
}

function applyLayout(layout: OctoLayout): void {
  document.documentElement.dataset.layout = layout
  document.body.dataset.layout = layout
}

export interface OctoThemeState {
  theme: OctoTheme
  layout: OctoLayout
  setTheme: (t: OctoTheme) => void
  setLayout: (l: OctoLayout) => void
}

export function useOctoTheme(): OctoThemeState {
  const [theme, setThemeState] = useState<OctoTheme>(readTheme)
  const [layout, setLayoutState] = useState<OctoLayout>(readLayout)

  // Apply on mount
  useEffect(() => {
    applyTheme(theme)
    applyLayout(layout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback((t: OctoTheme) => {
    setThemeState(t)
    applyTheme(t)
    try { localStorage.setItem(THEME_KEY, t === 'dark' ? '1' : '0') } catch { /* noop */ }
  }, [])

  const setLayout = useCallback((l: OctoLayout) => {
    setLayoutState(l)
    applyLayout(l)
    try { localStorage.setItem(LAYOUT_KEY, l) } catch { /* noop */ }
  }, [])

  return { theme, layout, setTheme, setLayout }
}

/**
 * Initialize theme/layout from localStorage before React render.
 * Call once in main.tsx before createRoot().
 */
export function initOctoTheme(): void {
  applyTheme(readTheme())
  applyLayout(readLayout())
}
