# FilePreviewPanel 文件预览面板

> 基于策略模式的文件预览组件，支持多种文件类型的渲染，可扩展注册新渲染器

## 核心文件

| 文件 | 职责 |
|------|------|
| `packages/dmworkbase/src/Components/FilePreviewPanel/index.tsx` | 主面板容器（header + 内容区） |
| `packages/dmworkbase/src/Components/FilePreviewPanel/registry.ts` | 渲染器注册表（策略模式核心） |
| `packages/dmworkbase/src/Components/FilePreviewPanel/types.ts` | 类型定义：FilePreviewInfo, BaseRendererProps, FileType |
| `packages/dmworkbase/src/Components/FilePreviewPanel/hooks/useFileContent.ts` | 文件内容加载 Hook |
| `packages/dmworkbase/src/Components/FilePreviewPanel/renderers/index.ts` | 渲染器统一导出 |

## 业务流程

### 渲染器选择链路
```
index.tsx:FilePreviewPanel 
  → getExtension() 提取扩展名
  → registry.ts:FileRendererRegistry.getRenderer(ext) 查找渲染器
  → 匹配 renderers/ 下的对应渲染器组件
```

### 渲染器注册（初始化时）
```
registry.ts:registerDefaults() 
  → 各渲染器静态注册到 Map<扩展名, RendererRegistryItem>
```

## 渲染器清单

| 渲染器 | 扩展名 | 依赖 | needsFetch |
|--------|--------|------|------------|
| ImageRenderer | png, jpg, jpeg, gif, bmp, webp, svg | 无 | 否 |
| PdfRenderer | pdf | @react-pdf-viewer/* | 否 |
| MarkdownRenderer | md, markdown | MarkdownContent | 是 |
| CodeRenderer | js, ts, py, java 等 30+ | react-syntax-highlighter | 是 |
| JsonRenderer | json | react-syntax-highlighter | 是 |
| JsonlRenderer | jsonl | react-syntax-highlighter | 是 |
| TextRenderer | txt, log, ini | 无 | 是 |
| HtmlRenderer | html, htm | iframe | 是 |
| ExcelRenderer | xlsx, xls, csv | xlsx (动态导入) | 是 |
| FallbackRenderer | 其他 | lucide-react | 否 |

## Excel 渲染器架构

### 文件
| 文件 | 职责 |
|------|------|
| `renderers/ExcelRenderer.tsx` | Excel/CSV 解析、工作表切换、分页表格渲染 |
| `renderers/ExcelRenderer.css` | 表格样式、分页控件样式 |

### 数据流
```
file.url
  → fetch → ArrayBuffer (Excel) / text (CSV)
  → xlsx.read() / CSV parse
  → SheetData { name, headers, rows }
  → 分页渲染（每页 100 行）
```

### 分页实现
```typescript
const pageSize = 100; // 每页行数
const visibleRows = currentSheet.rows.slice(startRow, endRow);
```

### 界面结构
- **工作表 Tabs**：底部工作表切换（多 sheet 时显示）
- **表格区域**：`<table>` 标签，每页最多 100 行
- **分页控件**：首页/上一页/下一页/末页 + 页码信息

## 虚拟滚动方案（VLManager + VirtualList）

> **已放弃**：因 CSS flex 高度链问题无法解决，用户明确决策回退到分页方案

### 核心文件（已删除）
| 文件 | 职责 |
|------|------|
| `renderers/VirtualList.tsx` | 虚拟列表组件，基于 ResizeObserver 计算可视区域 |
| `renderers/VLManager.ts` | 虚拟滚动状态管理：cache 高度缓存、render range 计算 |
| `renderers/TooltipCell.tsx` | 带 tooltip 的单元格，处理内容溢出 |

### 回退决策记录（2024-01）

用户决策原文：「要不你暂时去除虚拟列表？？一直不行 把代码改回去」

执行操作：
1. `git restore` 恢复 ExcelRenderer.tsx 等文件到修改前状态
2. 删除新增的虚拟滚动相关文件

**关键发现**：回退后分页版本同样没有滚动条，说明问题根本不在虚拟滚动，而是上游 CSS 高度链断裂。

## 扩展新渲染器

```typescript
import { fileRendererRegistry } from './registry';
import MyRenderer from './renderers/MyRenderer';

fileRendererRegistry.register({
  type: 'custom',
  extensions: ['ext1', 'ext2'],
  renderer: MyRenderer,
  needsFetch: true  // 是否需要预加载内容
});
```

## 设计决策

- **策略模式**：每种文件类型独立渲染器，避免条件堆砌，便于维护和扩展
- **needsFetch 区分**：部分渲染器（图片、PDF）直接用 url，其他需先 fetch 内容
- **动态导入 Excel 库**：xlsx 库体积大，采用动态导入避免首屏加载
- **分页替代虚拟滚动**：曾尝试虚拟滚动但因 CSS 高度约束复杂而放弃

## 注意事项

- 扩展名匹配不区分大小写，registry 内部统一转小写处理
- 暗色模式检测通过 `document.body.getAttribute("theme-mode")` 实现
- PDF 渲染依赖 @react-pdf-viewer 系列包，功能完整（缩略图、缩放、翻页）
- Excel 渲染采用分页方案（每页 100 行），支持多工作表切换
- xlsx 解析配置：`raw: false` 返回格式化字符串

### 高度约束问题诊断与修复（ExcelRenderer）

**问题现象**：表格无法滚动，检查 `clientHeight === scrollHeight`，容器高度被内容撑开

**诊断方法**：
```javascript
// 打印父容器高度链
let el = document.querySelector('.table-wrapper');
let i = 0;
while (el) {
  console.log(`parent[${i}] ${el.className} - clientHeight: ${el.clientHeight}`);
  el = el.parentElement;
  i++;
}
```

**根因**：flex 布局中子元素高度未被正确限制，`.wk-file-preview-content` 缺少 `min-height: 0`

**修复方案（绝对定位）**：
```css
/* ExcelRenderer.css */
.wk-file-preview-excel-renderer {
  flex: 1;
  min-height: 0;
  position: relative;  /* 绝对定位上下文 */
}

.wk-file-preview-excel-renderer__table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
```

### 虚拟滚动方案教训

**为何放弃**：
- VirtualList 需要父容器有明确高度约束
- 单纯 `flex: 1; min-height: 0` 不足以限制高度，容器仍会撑开到内容高度
- 多层 flex 嵌套时，每层必须设置 `min-height: 0` 且最内层需特殊处理
- 虚拟滚动容器和父容器不能同时设置 `overflow`，否则冲突

**调试时的错误排查顺序**：
1. 检查数据是否正确加载（console.log rows/cols）
2. 检查容器高度链（打印 parent clientHeight）
3. 确认 `clientHeight < scrollHeight` 是滚动的前提
4. 检查 CSS flex 链是否完整（每层 `min-height: 0`）

- 待实现：VideoRenderer, AudioRenderer, PptRenderer
