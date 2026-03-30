import React, { useState } from 'react'
import { TextArea } from '@douyinfe/semi-ui'
import './index.css'

export interface InputEditProps {
  onChange?: (value: string, exceeded?: boolean) => void
  defaultValue?: string
  placeholder?: string
  maxCount?: number
  /** 是否允许换行，默认 false（Enter 不换行） */
  allowWrap?: boolean
  className?: string
}

const InputEdit: React.FC<InputEditProps> = ({
  onChange,
  defaultValue,
  placeholder,
  maxCount,
  allowWrap = false,
  className,
}) => {
  const [value, setValue] = useState(defaultValue ?? '')
  const count = value.length
  const exceeded = !!(maxCount && count > maxCount)

  return (
    <div className={['wk-inputedit', exceeded ? 'wk-inputedit--exceeded' : '', className || ''].filter(Boolean).join(' ')}>
      <TextArea
        value={value}
        placeholder={placeholder}
        autosize={{ minRows: 2, maxRows: 6 }}
        showClear
        onChange={(v) => {
          setValue(v)
          onChange?.(v, !!(maxCount && v.length > maxCount))
        }}
        onKeyDown={(e) => {
          if (!allowWrap && e.keyCode === 13) {
            e.preventDefault()
          }
        }}
      />
      {maxCount && (
        <div className={['wk-inputedit__count', exceeded ? 'wk-inputedit__count--exceeded' : ''].filter(Boolean).join(' ')}>
          {count} / {maxCount}
        </div>
      )}
    </div>
  )
}

export default InputEdit
export { InputEdit }
