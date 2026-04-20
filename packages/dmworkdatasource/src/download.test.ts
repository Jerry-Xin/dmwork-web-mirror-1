import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { downloadFile } from '@dmwork/base/src/Utils/download'

describe('downloadFile', () => {
  let capturedAnchor: HTMLAnchorElement | null = null

  beforeEach(() => {
    capturedAnchor = null
    vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
      capturedAnchor = node as HTMLAnchorElement
      ;(node as HTMLAnchorElement).click = vi.fn()
      return node
    })
    vi.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('appends response-content-disposition for cross-origin URLs', () => {
    downloadFile('https://cdn.example.com/image.png', 'photo.png')

    expect(capturedAnchor).not.toBeNull()
    const href = capturedAnchor!.href
    expect(href).toContain('response-content-disposition=')
    expect(href).toContain('photo.png')
  })

  it('uses & separator when cross-origin URL already has query params', () => {
    downloadFile('https://cdn.example.com/image.png?token=abc', 'photo.png')

    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor!.href).toContain('&response-content-disposition=')
  })

  it('uses ? separator when cross-origin URL has no query params', () => {
    downloadFile('https://cdn.example.com/image.png', 'photo.png')

    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor!.href).toContain('image.png?response-content-disposition=')
  })

  it('encodes Unicode filenames in response-content-disposition', () => {
    downloadFile('https://cdn.example.com/image.png', '测试图片.png')

    expect(capturedAnchor).not.toBeNull()
    const href = capturedAnchor!.href
    // The filename is first encodeURIComponent-ed in the disposition value,
    // then the whole disposition is encodeURIComponent-ed for the query param,
    // so % signs become %25 (double-encoded).
    expect(href).toContain('response-content-disposition=')
    expect(href).toContain('%25E6%25B5%258B') // 测 double-encoded
  })

  it('does nothing for empty URL', () => {
    downloadFile('', 'photo.png')
    expect(capturedAnchor).toBeNull()
  })

  it('does nothing for javascript: URL', () => {
    downloadFile('javascript:alert(1)', 'photo.png')
    expect(capturedAnchor).toBeNull()
  })
})
