import { useMemo } from 'react'
import WKApp from '../../App'
import { MessageWrap } from '../../Service/Model'
import { getMessageRow } from './useMessageRow'
import type { ImageItem } from '../../ui/message/ImageContent/MultiImage'

/**
 * getImageMessageUI - 纯函数版本
 *
 * @description 从 MessageWrap 提取图片消息 UI 数据
 */
export function getImageMessageUI(message: MessageWrap) {
  const rowProps = getMessageRow(message)
  const content = message.content as any

  const getImageSrc = (url: string, width: number, height: number) => {
    if (url && url !== '') {
      return WKApp.dataSource.commonDataSource.getImageURL(url, { width, height })
    }
    return content.imgData || ''
  }

  // 多图：content.images 数组
  if (Array.isArray(content.images) && content.images.length > 0) {
    const images: ImageItem[] = content.images.map((img: any) => ({
      src: getImageSrc(img.url || img.remoteUrl || '', img.width || 0, img.height || 0),
      width: img.width || 0,
      height: img.height || 0,
    }))
    return {
      row: rowProps,
      isMulti: true,
      images,
      // 单图字段留空
      singleImage: null,
    }
  }

  // 单图
  const src = getImageSrc(content.url || content.remoteUrl || '', content.width || 0, content.height || 0)
  return {
    row: rowProps,
    isMulti: false,
    images: [],
    singleImage: {
      src,
      width: content.width || 0,
      height: content.height || 0,
    },
  }
}

/**
 * useImageMessageUI Hook
 * @description useMemo wrapper around getImageMessageUI for React components
 */
export function useImageMessageUI(message: import('../../Service/Model').MessageWrap) {
  return useMemo(() => getImageMessageUI(message), [message])
}
