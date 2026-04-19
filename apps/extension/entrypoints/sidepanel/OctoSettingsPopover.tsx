/**
 * OctoSettingsPopover — theme + layout selector
 *
 * Two segments:
 *   1. Layout: message (日常阅读) / cli (紧凑终端)
 *   2. Theme:  paper / terminal / moonwire (each with a colored dot)
 *
 * Click outside to close. Selecting an option applies immediately.
 */

import React, { useRef, useEffect, useCallback } from 'react'
import type { OctoTheme, OctoLayout } from './useOctoTheme'
import { showToast } from './OctoToast'

interface OctoSettingsPopoverProps {
  isOpen: boolean
  onClose: () => void
  theme: OctoTheme
  layout: OctoLayout
  onThemeChange: (t: OctoTheme) => void
  onLayoutChange: (l: OctoLayout) => void
}

const THEME_OPTIONS: Array<{ id: OctoTheme; label: string }> = [
  { id: 'paper', label: 'Paper' },
  { id: 'terminal', label: 'Term' },
  { id: 'moonwire', label: 'Moon' },
]

const LAYOUT_OPTIONS: Array<{ id: OctoLayout; label: string }> = [
  { id: 'message', label: '\u6D88\u606F\u7248' },  // 消息版
  { id: 'cli', label: 'CLI' },
]

const THEME_LABELS: Record<OctoTheme, string> = {
  paper: 'Paper',
  terminal: 'Terminal',
  moonwire: 'Moonwire',
}

const LAYOUT_LABELS: Record<OctoLayout, string> = {
  message: '\u6D88\u606F\u7248',  // 消息版
  cli: 'CLI',
}

const OctoSettingsPopover: React.FC<OctoSettingsPopoverProps> = ({
  isOpen,
  onClose,
  theme,
  layout,
  onThemeChange,
  onLayoutChange,
}) => {
  const popRef = useRef<HTMLDivElement>(null)

  // Click outside to close
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (!isOpen) return
      const pop = popRef.current
      if (!pop) return
      if (!pop.contains(e.target as Node)) {
        // Check if click is on the settings button itself (parent handles toggle)
        const btn = (e.target as Element)?.closest?.('.octo-sidepanel-demo-btn[title="\u8BBE\u7F6E"]')
        if (!btn) {
          onClose()
        }
      }
    },
    [isOpen, onClose],
  )

  useEffect(() => {
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [handlePointerDown])

  // ESC to close
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey, true)
    return () => document.removeEventListener('keydown', handleKey, true)
  }, [isOpen, onClose])

  const handleTheme = (t: OctoTheme) => {
    onThemeChange(t)
    showToast('\u4E3B\u9898 \u00B7 ' + THEME_LABELS[t])
  }

  const handleLayout = (l: OctoLayout) => {
    onLayoutChange(l)
    showToast('\u9605\u8BFB\u6A21\u5F0F \u00B7 ' + LAYOUT_LABELS[l])
  }

  return (
    <div
      ref={popRef}
      className={`octo-settings-pop${isOpen ? ' is-open' : ''}`}
    >
      {/* Layout segment */}
      <div className="octo-settings-section">{'\u9605\u8BFB\u6A21\u5F0F'}</div>
      <div className="octo-settings-seg">
        {LAYOUT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`octo-settings-seg-btn${layout === opt.id ? ' is-active' : ''}`}
            onClick={() => handleLayout(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Theme segment */}
      <div className="octo-settings-section">{'\u4E3B\u9898'}</div>
      <div className="octo-settings-seg">
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`octo-settings-seg-btn${theme === opt.id ? ' is-active' : ''}`}
            onClick={() => handleTheme(opt.id)}
          >
            <span className="octo-settings-seg-dot" data-theme={opt.id} />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default OctoSettingsPopover
export { OctoSettingsPopover }
