/**
 * OctoToast — global toast notification system
 *
 * Theme-aware:
 *   paper     → dark pill, normal text
 *   terminal  → dark pill, uppercase mono
 *   moonwire  → inverted light pill
 *
 * All styling driven by --octo-toast-* tokens in tokens.css.
 *
 * Usage:
 *   import { OctoToast, showToast } from './OctoToast'
 *   // In JSX: <OctoToast />
 *   // Anywhere: showToast('已复制')
 */

import React, { useState, useEffect, useCallback } from 'react'

interface ToastEvent {
  message: string
  id: number
}

// Simple event bus for toast
type ToastListener = (evt: ToastEvent) => void
const listeners = new Set<ToastListener>()
let toastId = 0

export function showToast(message: string): void {
  toastId += 1
  const evt: ToastEvent = { message, id: toastId }
  listeners.forEach((fn) => fn(evt))
}

const TOAST_DURATION = 1400

const OctoToast: React.FC = () => {
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')

  const handleToast = useCallback((evt: ToastEvent) => {
    setText(evt.message)
    setVisible(true)
  }, [])

  useEffect(() => {
    listeners.add(handleToast)
    return () => { listeners.delete(handleToast) }
  }, [handleToast])

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => setVisible(false), TOAST_DURATION)
    return () => window.clearTimeout(timer)
  }, [visible, text])

  return (
    <div className={`octo-toast${visible ? ' is-visible' : ''}`}>
      {text}
    </div>
  )
}

export default OctoToast
export { OctoToast }
