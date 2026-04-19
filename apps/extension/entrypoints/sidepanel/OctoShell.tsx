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
