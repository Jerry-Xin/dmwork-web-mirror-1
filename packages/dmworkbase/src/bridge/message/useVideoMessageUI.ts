import { useMemo } from 'react'
import WKApp from '../../App'
import { MessageWrap } from '../../Service/Model'
import { getMessageRow } from './useMessageRow'

/**
 * getVideoMessageUI - 纯函数版本
 *
 * @description 从 MessageWrap 提取视频消息 UI 数据
 */
export function getVideoMessageUI(message: MessageWrap) {
  const rowProps = getMessageRow(message)
  const content = message.content as any

  const src = WKApp.dataSource.commonDataSource.getFileURL(content.url || '')
  const coverSrc = WKApp.dataSource.commonDataSource.getImageURL(content.cover || '')

  return {
    row: rowProps,
    video: {
      src,
      coverSrc,
      width: content.width || 0,
      height: content.height || 0,
      duration: content.second || 0,
    },
  }
}

/**
 * useVideoMessageUI Hook
 * @description useMemo wrapper around getVideoMessageUI for React components
 */
export function useVideoMessageUI(message: import('../../Service/Model').MessageWrap) {
  return useMemo(() => getVideoMessageUI(message), [message])
}
