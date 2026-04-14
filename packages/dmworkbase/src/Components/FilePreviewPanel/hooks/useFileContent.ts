import { useState, useEffect, useCallback } from 'react'

export interface UseFileContentOptions {
  url: string
  enabled?: boolean
}

export interface UseFileContentResult {
  content: string | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * 文件内容加载 Hook
 * 用于需要预加载内容的渲染器（Markdown、Code、Text 等）
 */
export function useFileContent(options: UseFileContentOptions): UseFileContentResult {
  const { url, enabled = true } = options

  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadContent = useCallback(async () => {
    if (!url || !enabled) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const buffer = await response.arrayBuffer()
      const text = new TextDecoder('utf-8').decode(buffer)
      setContent(text)
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败'
      setError(message)
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [url, enabled])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const reload = useCallback(() => {
    loadContent()
  }, [loadContent])

  return {
    content,
    loading,
    error,
    reload,
  }
}

export default useFileContent
