import React, { Component } from "react"
import { X, Download, ExternalLink } from "lucide-react"
import "./index.css"
import MarkdownContent from "../../Messages/Text/MarkdownContent"

export interface FilePreviewInfo {
  url: string
  name: string
  extension: string
  size?: number
}

export interface FilePreviewPanelProps {
  file: FilePreviewInfo | null
  onClose: () => void
}

interface FilePreviewPanelState {
  loading: boolean
  error: string | null
  textContent: string | null
}

// 支持预览的文件类型
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"]
const PDF_EXTENSIONS = ["pdf"]
const MARKDOWN_EXTENSIONS = ["md", "markdown"]
const CODE_EXTENSIONS = [
  "txt", "js", "jsx", "ts", "tsx", "json", "css", "scss", "less",
  "html", "xml", "yaml", "yml", "py", "java", "c", "cpp", "h", "hpp",
  "go", "rs", "rb", "php", "sh", "bash", "sql", "vue", "svelte"
]

function getExtension(ext: string, name?: string): string {
  const e = (ext || "").toLowerCase()
  if (e) return e
  if (name) {
    const dot = name.lastIndexOf(".")
    if (dot >= 0) return name.substring(dot + 1).toLowerCase()
  }
  return ""
}

function isImage(ext: string): boolean {
  return IMAGE_EXTENSIONS.includes(ext)
}

function isPDF(ext: string): boolean {
  return PDF_EXTENSIONS.includes(ext)
}

function isMarkdown(ext: string): boolean {
  return MARKDOWN_EXTENSIONS.includes(ext)
}

function isCode(ext: string): boolean {
  return CODE_EXTENSIONS.includes(ext)
}

function isTextPreviewable(ext: string): boolean {
  return isMarkdown(ext) || isCode(ext)
}

export function canPreviewInPanel(extension: string, name?: string): boolean {
  const ext = getExtension(extension, name)
  return isImage(ext) || isPDF(ext) || isMarkdown(ext) || isCode(ext)
}

// 根据扩展名返回语言类型（用于代码高亮）
function getLanguageFromExt(ext: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    yml: "yaml",
    sh: "bash",
    bash: "bash",
    md: "markdown",
    markdown: "markdown",
  }
  return map[ext] || ext
}

export default class FilePreviewPanel extends Component<FilePreviewPanelProps, FilePreviewPanelState> {
  constructor(props: FilePreviewPanelProps) {
    super(props)
    this.state = {
      loading: false,
      error: null,
      textContent: null,
    }
  }

  componentDidMount() {
    this.loadContent()
  }

  componentDidUpdate(prevProps: FilePreviewPanelProps) {
    if (prevProps.file?.url !== this.props.file?.url) {
      this.loadContent()
    }
  }

  async loadContent() {
    const { file } = this.props
    if (!file) return

    const ext = getExtension(file.extension, file.name)

    // 只有文本类文件需要加载内容
    if (!isTextPreviewable(ext)) {
      this.setState({ textContent: null, loading: false, error: null })
      return
    }

    this.setState({ loading: true, error: null })

    try {
      const response = await fetch(file.url)
      if (!response.ok) {
        throw new Error("文件加载失败")
      }
      const buffer = await response.arrayBuffer()
      const text = new TextDecoder("utf-8").decode(buffer)
      this.setState({ textContent: text, loading: false })
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : "加载失败",
        loading: false,
      })
    }
  }

  handleDownload = () => {
    const { file } = this.props
    if (!file) return

    const a = document.createElement("a")
    a.href = file.url
    a.download = file.name || "file"
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  handleOpenExternal = () => {
    const { file } = this.props
    if (!file) return
    window.open(file.url, "_blank")
  }

  renderContent() {
    const { file } = this.props
    const { loading, error, textContent } = this.state

    if (!file) return null

    const ext = getExtension(file.extension, file.name)

    if (loading) {
      return (
        <div className="wk-file-preview-loading">
          <div className="wk-file-preview-spinner" />
          <span>加载中...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="wk-file-preview-error">
          <span>{error}</span>
          <button onClick={() => this.loadContent()}>重试</button>
        </div>
      )
    }

    // 图片预览
    if (isImage(ext)) {
      return (
        <div className="wk-file-preview-image">
          <img src={file.url} alt={file.name} />
        </div>
      )
    }

    // PDF 预览
    if (isPDF(ext)) {
      return (
        <div className="wk-file-preview-pdf">
          <iframe
            src={file.url}
            title={file.name}
            width="100%"
            height="100%"
          />
        </div>
      )
    }

    // Markdown 预览
    if (isMarkdown(ext) && textContent !== null) {
      return (
        <div className="wk-file-preview-markdown">
          <MarkdownContent content={textContent} />
        </div>
      )
    }

    // 代码/文本预览
    if (isCode(ext) && textContent !== null) {
      const lang = getLanguageFromExt(ext)
      return (
        <div className="wk-file-preview-code">
          <pre data-language={lang}>
            <code>{textContent}</code>
          </pre>
        </div>
      )
    }

    return (
      <div className="wk-file-preview-unsupported">
        <span>暂不支持预览此文件类型</span>
        <button onClick={this.handleDownload}>下载文件</button>
      </div>
    )
  }

  render() {
    const { file, onClose } = this.props

    if (!file) return null

    return (
      <div className="wk-file-preview-panel">
        <div className="wk-file-preview-header">
          <div className="wk-file-preview-title" title={file.name}>
            {file.name}
          </div>
          <div className="wk-file-preview-actions">
            <button
              className="wk-file-preview-action"
              title="在新窗口打开"
              onClick={this.handleOpenExternal}
            >
              <ExternalLink size={18} />
            </button>
            <button
              className="wk-file-preview-action"
              title="下载"
              onClick={this.handleDownload}
            >
              <Download size={18} />
            </button>
            <button
              className="wk-file-preview-action wk-file-preview-close"
              title="关闭"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="wk-file-preview-content">
          {this.renderContent()}
        </div>
      </div>
    )
  }
}

export { FilePreviewPanel }
