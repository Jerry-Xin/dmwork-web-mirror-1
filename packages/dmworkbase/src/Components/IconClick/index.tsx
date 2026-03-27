import React, { ReactNode } from 'react'
import './index.css'

export interface IconClickProps {
  icon: string | ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  /** 尺寸，影响 padding */
  size?: 'sm' | 'md'
  title?: string
}

const IconClick: React.FC<IconClickProps> = ({
  icon,
  onClick,
  disabled = false,
  className,
  size = 'md',
  title,
}) => {
  const cls = [
    'wk-iconclick',
    `wk-iconclick--${size}`,
    disabled ? 'wk-iconclick--disabled' : '',
    className || '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      onClick={() => { if (!disabled && onClick) onClick() }}
      role="button"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      title={title}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !disabled) { e.preventDefault(); onClick?.() } }}
    >
      {typeof icon === 'string' ? (
        <img src={icon} width={20} height={20} alt={title || ''} />
      ) : icon}
    </div>
  )
}

export default IconClick
