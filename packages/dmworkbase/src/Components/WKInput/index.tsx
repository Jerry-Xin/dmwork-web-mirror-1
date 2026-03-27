import React, { InputHTMLAttributes, forwardRef } from 'react'
import './index.css'

export type WKInputSize = 'sm' | 'md' | 'lg'

export interface WKInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  size?: WKInputSize
  /** 受控值 */
  value?: string
  onChange?: (value: string) => void
  /** Enter 触发 */
  onEnterPress?: () => void
  /** 错误状态 */
  error?: boolean
  /** 前缀 slot */
  prefix?: React.ReactNode
  /** 后缀 slot */
  suffix?: React.ReactNode
  className?: string
}

const WKInput = forwardRef<HTMLInputElement, WKInputProps>(({
  size = 'md',
  value,
  onChange,
  onEnterPress,
  error = false,
  prefix,
  suffix,
  className,
  onKeyDown: externalOnKeyDown,
  ...rest
}, ref) => {
  const cls = [
    'wk-input',
    `wk-input--${size}`,
    error ? 'wk-input--error' : '',
    prefix ? 'wk-input--has-prefix' : '',
    suffix ? 'wk-input--has-suffix' : '',
    className || '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls}>
      {prefix && <span className="wk-input__prefix">{prefix}</span>}
      <input
        ref={ref}
        className="wk-input__inner"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnterPress?.()
          externalOnKeyDown?.(e)
        }}
        {...rest}
      />
      {suffix && <span className="wk-input__suffix">{suffix}</span>}
    </div>
  )
})

WKInput.displayName = 'WKInput'
export default WKInput
