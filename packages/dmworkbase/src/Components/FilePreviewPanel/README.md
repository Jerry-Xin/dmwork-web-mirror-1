# FilePreviewPanel 文件预览组件

> 基于策略模式的文件预览组件，支持多种文件类型的预览

## 一、概述

`FilePreviewPanel` 是一个可扩展的文件预览面板组件，采用策略模式设计，每种文件类型对应独立的渲染器，便于维护和扩展。

## 二、目录结构

```
FilePreviewPanel/
├── index.tsx                 # 主入口，面板容器
├── index.css                 # 面板样式
├── types.ts                  # 类型定义
├── registry.ts               # 渲染器注册表（策略模式核心）
├── FilePreviewPanel.stories.tsx  # Storybook Stories
├── README.md                 # 本文档
├── hooks/
│   └── useFileContent.ts     # 文件内容加载 Hook
└── renderers/                # 各类型渲染器
    ├── index.ts              # 渲染器统一导出
    ├── ImageRenderer.tsx     # 图片渲染器
    ├── ImageRenderer.css
    ├── PdfRenderer.tsx       # PDF 渲染器
    ├── PdfRenderer.css
    ├── MarkdownRenderer.tsx  # Markdown 渲染器
    ├── MarkdownRenderer.css
    ├── CodeRenderer.tsx      # 代码渲染器
    ├── CodeRenderer.css
    ├── TextRenderer.tsx      # 纯文本渲染器
    ├── TextRenderer.css
    ├── HtmlRenderer.tsx      # HTML 渲染器
    ├── HtmlRenderer.css
    ├── ExcelRenderer.tsx     # Excel/CSV 渲染器（虚拟滚动）
    ├── ExcelRenderer.css
    ├── VLManager.ts          # 虚拟列表管理器
    ├── VirtualList.tsx       # 虚拟列表组件
    ├── TooltipCell.tsx       # 单元格 Tooltip 组件
    ├── TooltipCell.css
    ├── FallbackRenderer.tsx  # 兜底渲染器
    └── FallbackRenderer.css
```

## 三、已实现的渲染器

| 渲染器 | 扩展名 | 说明 | 依赖 |
|--------|--------|------|------|
| `ImageRenderer` | png, jpg, jpeg, gif, bmp, webp, svg | 智能适应模式，hover 操作按钮 | - |
| `PdfRenderer` | pdf | 缩略图、缩放、翻页 | `@react-pdf-viewer/*` |
| `MarkdownRenderer` | md, markdown | Markdown 渲染 | `MarkdownContent` |
| `CodeRenderer` | js, jsx, ts, tsx, json, css, scss, less, xml, yaml, yml, py, java, c, cpp, h, hpp, go, rs, rb, php, sh, bash, sql, vue, svelte | 语法高亮、行号 | `react-syntax-highlighter` |
| `TextRenderer` | txt, log, ini, conf, cfg | 纯文本显示 | - |
| `HtmlRenderer` | html, htm | iframe 渲染预览 | - |
| `ExcelRenderer` | xlsx, xls, xlsb, xlsm, csv | Excel/CSV 表格预览，多工作表切换，虚拟滚动 | `xlsx`, `VirtualList` |
| `JsonRenderer` | json | JSON 格式化 + 表格视图切换 | `react-syntax-highlighter` |
| `JsonlRenderer` | jsonl | JSONL 格式化 + 表格视图切换 | `react-syntax-highlighter` |
| `FallbackRenderer` | 其他 | 文件信息卡片 + 下载按钮 | - |

## 四、与 dm__test 对比

### 已对齐

| 功能 | dm__test | FilePreviewPanel |
|------|----------|------------------|
| 图片预览 | `ImageRenderWithActions` | ✅ `ImageRenderer` |
| PDF 预览 | `PDFViewer` | ✅ `PdfRenderer` |
| Markdown | `Markdown` | ✅ `MarkdownRenderer` |
| HTML 预览 | `HtmlPreview` | ✅ `HtmlRenderer` |
| 代码高亮 | `CodeRaw` | ✅ `CodeRenderer` |
| 纯文本 | `PureText` | ✅ `TextRenderer` |
| 不支持类型 | `DownloadFileCard` | ✅ `FallbackRenderer` |
| Excel/CSV 预览 | `ExcelTable` | ✅ `ExcelRenderer`（虚拟滚动、空行裁剪、重复列名处理） |
| JSON 格式化/表格 | `JsonRaw` / `JsonTableRender` | ✅ `JsonRenderer` |
| JSONL 格式化/表格 | `JsonlRaw` / `JsonlTableRender` | ✅ `JsonlRenderer` |

### 待实现

| 优先级 | 渲染器 | 扩展名 | dm__test 组件 | 说明 |
|--------|--------|--------|---------------|------|
| P3 | `VideoRenderer` | mp4, avi, mov, mkv, webm | - | 视频播放 |
| P3 | `AudioRenderer` | mp3, wav, aac, flac, ogg | - | 音频播放 |
| P3 | `PptRenderer` | ppt_html | `PptPreview` | PPT HTML 预览 |

## 五、核心接口

### 5.1 类型定义

```typescript
/** 文件预览信息 */
interface FilePreviewInfo {
  url: string;
  name: string;
  extension: string;
  size?: number;
}

/** 渲染器 Props 基类 */
interface BaseRendererProps {
  file: FilePreviewInfo;
  onError?: (error: string) => void;
}

/** 渲染器注册项 */
interface RendererRegistryItem {
  type: FileType;
  extensions: string[];
  renderer: FileRenderer;
  needsFetch?: boolean;
}
```

### 5.2 渲染器注册表

```typescript
import { fileRendererRegistry } from './registry';

// 获取渲染器
const { renderer, needsFetch } = fileRendererRegistry.getRenderer('pdf');

// 判断是否支持预览
const canPreview = fileRendererRegistry.canPreview('xlsx');

// 获取所有支持的扩展名
const extensions = fileRendererRegistry.getSupportedExtensions();
```

## 六、使用方式

### 6.1 基本使用

```tsx
import FilePreviewPanel, { canPreviewInPanel } from '@dmwork/base';

// 判断是否支持预览
if (canPreviewInPanel('pdf')) {
  // 显示预览面板
}

// 渲染预览面板
<FilePreviewPanel
  file={{
    url: 'https://example.com/file.pdf',
    name: 'document.pdf',
    extension: 'pdf',
    size: 1024000,
  }}
  onClose={() => setShowPanel(false)}
/>
```

### 6.2 扩展自定义渲染器

```typescript
import { fileRendererRegistry } from '@dmwork/base';
import MyCustomRenderer from './MyCustomRenderer';

// 注册自定义渲染器
fileRendererRegistry.register({
  type: 'custom',
  extensions: ['xyz', 'abc'],
  renderer: MyCustomRenderer,
  needsFetch: true,
});

// 覆盖默认渲染器
fileRendererRegistry.register({
  type: 'pdf',
  extensions: ['pdf'],
  renderer: MyBetterPdfRenderer,
  needsFetch: false,
});
```

## 七、渲染器开发规范

### 7.1 文件结构

```
renderers/
├── XxxRenderer.tsx    # 渲染器组件
└── XxxRenderer.css    # 渲染器样式
```

### 7.2 组件模板

```tsx
import React from 'react';
import { BaseRendererProps } from '../types';
import { useFileContent } from '../hooks/useFileContent';
import './XxxRenderer.css';

export interface XxxRendererProps extends BaseRendererProps {}

const XxxRenderer: React.FC<XxxRendererProps> = ({ file, onError }) => {
  // 如需加载内容
  const { content, loading, error, reload } = useFileContent({
    url: file.url,
  });

  if (loading) {
    return <div className="wk-file-preview-xxx-renderer--loading">...</div>;
  }

  if (error) {
    onError?.(error);
    return <div className="wk-file-preview-xxx-renderer--error">...</div>;
  }

  return (
    <div className="wk-file-preview-xxx-renderer">
      {/* 渲染内容 */}
    </div>
  );
};

export default XxxRenderer;
export { XxxRenderer };
```

### 7.3 CSS 规范

- 类名前缀：`wk-file-preview-{type}-renderer`
- 使用 CSS Token 变量：`var(--wk-*)`
- 支持暗色模式：`body[theme-mode="dark"]`
- 禁止 `!important`
- 禁止硬编码颜色

```css
.wk-file-preview-xxx-renderer {
  height: 100%;
  background: var(--wk-bg-base);
}

body[theme-mode="dark"] .wk-file-preview-xxx-renderer {
  background: #1a1a1a;
}
```

## 八、依赖说明

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@react-pdf-viewer/core` | ^3.12.0 | PDF 渲染核心 |
| `@react-pdf-viewer/thumbnail` | ^3.12.0 | PDF 缩略图 |
| `@react-pdf-viewer/zoom` | ^3.12.0 | PDF 缩放 |
| `@react-pdf-viewer/page-navigation` | ^3.12.0 | PDF 翻页 |
| `react-syntax-highlighter` | ^15.6.1 | 代码语法高亮 |
| `xlsx` | ^0.18.5 | Excel/CSV 表格解析 |

## 九、Storybook

```bash
cd apps/web
pnpm storybook
# 访问 http://localhost:16006
# 路径: Components / FilePreviewPanel
```

### Stories 列表

- `Interactive` - 交互式切换文件类型
- `ImagePreview` - 图片预览
- `PdfPreview` - PDF 预览
- `MarkdownPreview` - Markdown 预览
- `CodePreview` - 代码预览
- `JsonPreview` - JSON 预览（基础对象）
- `JsonArrayPreview` - JSON 数组预览（表格视图）
- `JsonLargeArrayPreview` - JSON 大数据量预览（分页）
- `JsonlPreview` - JSONL 预览（事件日志）
- `JsonlLargePreview` - JSONL 大数据量预览（分页）
- `TextPreview` - 纯文本预览
- `HtmlPreview` - HTML 预览
- `ExcelPreview` - Excel/CSV 预览
- `UnsupportedType` - 不支持类型
- `NoFile` - 空文件
- `LongFileName` - 长文件名
## 十、后续计划

### P1 - 高优先级

- [x] `ExcelRenderer` - Excel/CSV 表格预览 ✅
  - 依赖：`xlsx`
  - 支持 xlsx, xls, xlsb, xlsm, csv 格式
  - 支持多工作表切换、分页、表格展示

- [x] `JsonRenderer` - JSON 格式化 + 表格视图切换 ✅
  - 依赖：`react-syntax-highlighter`
  - 支持代码视图（格式化 JSON + 语法高亮）
  - 支持表格视图（智能提取数组数据）
  - 支持视图切换、分页

- [x] `JsonlRenderer` - JSONL 格式化 + 表格视图切换 ✅
  - 依赖：`react-syntax-highlighter`
  - 支持每行独立 JSON 对象解析
  - 默认表格视图（JSONL 天然适合表格展示）
  - 显示行数统计和有效记录数
  - 支持视图切换、分页

### P2 - 中优先级

- [ ] 国际化支持（i18n）

### P3 - 低优先级

- [ ] `VideoRenderer` - 视频播放器
- [ ] `AudioRenderer` - 音频播放器
- [ ] `PptRenderer` - PPT HTML 预览

## 十一、变更记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2024-01 | 1.0.0 | 初始实现，策略模式重构 |
| - | 1.0.0 | 类组件 → 函数组件 |
| - | 1.0.0 | 新增 ImageRenderer, PdfRenderer, MarkdownRenderer, CodeRenderer, TextRenderer, FallbackRenderer |
| - | 1.1.0 | PdfRenderer 升级为 @react-pdf-viewer |
| - | 1.1.0 | CodeRenderer 升级为 react-syntax-highlighter |
| - | 1.2.0 | 新增 HtmlRenderer (iframe 渲染) |
| - | 1.2.0 | FallbackRenderer 优化为卡片样式 |
| - | 1.3.0 | 新增 ExcelRenderer (xlsx/xls/csv 表格预览) |
| - | 1.4.0 | 新增 JsonRenderer (JSON 格式化 + 表格视图切换) |
| - | 1.5.0 | 新增 JsonlRenderer (JSONL 格式化 + 表格视图切换) |