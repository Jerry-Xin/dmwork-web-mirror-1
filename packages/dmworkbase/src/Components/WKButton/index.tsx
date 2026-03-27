import React, { ButtonHTMLAttributes, ReactNode } from 'react'
import './index.css'

export type WKButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type WKButtonSize = 'md' | 'sm'

export interface WKButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮类型 */
  variant?: WKButtonVariant
  /** 按钮尺寸 */
  size?: WKButtonSize
  /** 加载状态 */
  loading?: boolean
  /** 仅图标模式（正方形，不显示 children 文字） */
  iconOnly?: boolean
  /** 左侧图标 */
  icon?: ReactNode
  children?: ReactNode
}

const WKButton: React.FC<WKButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  iconOnly = false,
  icon,
  children,
  className,
  disabled,
  ...rest
}) => {
  const cls = [
    'wk-btn',
    `wk-btn--${variant}`,
    `wk-btn--${size}`,
    iconOnly ? 'wk-btn--icon-only' : '',
    loading ? 'wk-btn--loading' : '',
    className || '',
  ].filter(Boolean).join(' ')

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && (
        <span className="wk-btn__spinner" aria-hidden="true" />
      )}
      {!loading && icon && (
        <span className="wk-btn__icon">{icon}</span>
      )}
      {!iconOnly && children && (
        <span className="wk-btn__label">{children}</span>
      )}
    </button>
  )
}

export default WKButton
