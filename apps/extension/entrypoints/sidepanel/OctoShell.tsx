/**
 * OctoShell — root shell component for the sidepanel
 *
 * 目前仅承载 children + 全局 Toast；theme / settings 已交由其他组件处理。
 */

import React from 'react'
import OctoToast from './OctoToast'

interface OctoShellProps {
  children: React.ReactNode
  onClose?: () => void
}

const OctoShell: React.FC<OctoShellProps> = ({ children }) => {
  return (
    <div className="octo-sidepanel-shell">
      <div className="octo-sidepanel-app">{children}</div>
      <OctoToast />
    </div>
  )
}

export default OctoShell
export { OctoShell }
