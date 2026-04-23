import React, { useRef, useState } from 'react'
import './index.css'

export interface VideoContentProps {
  /** 视频 URL */
  src: string
  /** 封面图 URL */
  coverSrc?: string
  /** 原始宽度 */
  width: number
  /** 原始高度 */
  height: number
  /** 时长（秒） */
  duration?: number
}

const MAX_HEIGHT = 224
const MAX_WIDTH = 660

function calcVideoSize(width: number, height: number) {
  if (width <= MAX_WIDTH && height <= MAX_HEIGHT) {
    return { width, height }
  }
  const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * 视频消息组件
 *
 * @description 最大高度 224px，宽度按比例适配，双击全屏播放（Figma B-8-1 421:67449）
 */
export default function VideoContent({
  src,
  coverSrc,
  width,
  height,
  duration,
}: VideoContentProps) {
  const size = calcVideoSize(width, height)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleDoubleClick = () => {
    const video = videoRef.current
    if (!video) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    } else {
      video.requestFullscreen()
      setIsFullscreen(true)
    }
  }

  return (
    <div
      className="wk-msg-video"
      style={{ width: size.width, height: size.height }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={coverSrc}
        className="wk-msg-video-player"
        controls
        onDoubleClick={handleDoubleClick}
        playsInline
      />
      {duration !== undefined && (
        <span className="wk-msg-video-duration">{formatDuration(duration)}</span>
      )}
    </div>
  )
}
