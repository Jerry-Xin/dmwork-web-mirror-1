/**
 * OctoShell — root shell component for the sidepanel
 *
 * Owns the demo-bar, settings popover, toast, and theme/layout state.
 * Wraps the main <App /> component.
 */

import React, { useState, useCallback } from 'react'
import { useOctoTheme } from './useOctoTheme'
import OctoSettingsPopover from './OctoSettingsPopover'
import OctoToast from './OctoToast'

interface OctoShellProps {
  children: React.ReactNode
  onClose?: () => void
}

const OctoShell: React.FC<OctoShellProps> = ({ children, onClose }) => {
  const { theme, layout, setTheme, setLayout } = useOctoTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const toggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev)
  }, [])

  const closeSettings = useCallback(() => {
    setSettingsOpen(false)
  }, [])

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose()
    } else {
      try { window.close() } catch { /* noop */ }
    }
  }, [onClose])

  return (
    <div className="octo-sidepanel-shell">
      {/* Demo bar */}
      <div className="octo-sidepanel-demo-bar">
        <span className="octo-sidepanel-demo-logo">O</span>
        <span className="octo-sidepanel-demo-name">Octo</span>
        <span className="octo-sidepanel-demo-space">FT-A2 {'\u5DE5\u4F5C\u533A'}</span>
        <span className="octo-sidepanel-demo-spacer" />
        <button
          className="octo-sidepanel-demo-btn"
          title={'\u8BBE\u7F6E'}
          type="button"
          onClick={toggleSettings}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z" />
          </svg>
        </button>
        <button
          className="octo-sidepanel-demo-btn"
          title={'\u5173\u95ED'}
          type="button"
          onClick={handleClose}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* Settings popover anchored to demo-bar */}
        <OctoSettingsPopover
          isOpen={settingsOpen}
          onClose={closeSettings}
          theme={theme}
          layout={layout}
          onThemeChange={setTheme}
          onLayoutChange={setLayout}
        />
      </div>

      {/* Main app area */}
      <div className="octo-sidepanel-app">
        {children}
      </div>

      {/* Global toast */}
      <OctoToast />
    </div>
  )
}

export default OctoShell
export { OctoShell }
