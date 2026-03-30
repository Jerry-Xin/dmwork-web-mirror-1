import React, { ReactNode } from 'react'
import './index.css'

export interface WKNavHeaderProps {
  title: string
  rightView?: ReactNode
  className?: string
}

const WKNavHeader: React.FC<WKNavHeaderProps> = ({ title, rightView, className }) => (
  <div className={['wk-navheader', className || ''].filter(Boolean).join(' ')}>
    <div className="wk-navheader__content">
      <div className="wk-navheader__title">{title}</div>
      {rightView && <div className="wk-navheader__right">{rightView}</div>}
    </div>
  </div>
)

export default WKNavHeader
