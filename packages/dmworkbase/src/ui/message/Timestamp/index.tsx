import React from 'react'
import moment from 'moment'
import './index.css'

export interface TimestampProps {
  /** 时间戳（毫秒或秒） */
  time: number | string
  
  /** 格式化选项（默认 "HH:mm"） */
  format?: string
}

/**
 * 时间戳组件
 * 
 * @description 显示消息时间，支持自定义格式
 */
export default function Timestamp({
  time,
  format = 'HH:mm'
}: TimestampProps) {
  // 转换为毫秒时间戳
  const timestamp = typeof time === 'string' ? parseInt(time) : time
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
  
  return (
    <span className="wk-msg-timestamp">
      {moment(ms).format(format)}
    </span>
  )
}
