/**
 * 渲染器统一导出
 */

// 图片渲染器
export {
  default as ImageRenderer,
  ImageRenderer as ImageRendererComponent,
} from "./ImageRenderer";
export type { ImageRendererProps } from "./ImageRenderer";

// PDF 渲染器
export {
  default as PdfRenderer,
  PdfRenderer as PdfRendererComponent,
} from "./PdfRenderer";
export type { PdfRendererProps } from "./PdfRenderer";

// Markdown 渲染器
export {
  default as MarkdownRenderer,
  MarkdownRenderer as MarkdownRendererComponent,
} from "./MarkdownRenderer";
export type { MarkdownRendererProps } from "./MarkdownRenderer";

// 代码渲染器
export {
  default as CodeRenderer,
  CodeRenderer as CodeRendererComponent,
} from "./CodeRenderer";
export type { CodeRendererProps } from "./CodeRenderer";

// 纯文本渲染器
export {
  default as TextRenderer,
  TextRenderer as TextRendererComponent,
} from "./TextRenderer";
export type { TextRendererProps } from "./TextRenderer";

// 兜底渲染器
export {
  default as FallbackRenderer,
  FallbackRenderer as FallbackRendererComponent,
} from "./FallbackRenderer";
export type { FallbackRendererProps } from "./FallbackRenderer";

// HTML 渲染器
export {
  default as HtmlRenderer,
  HtmlRenderer as HtmlRendererComponent,
} from "./HtmlRenderer";
export type { HtmlRendererProps } from "./HtmlRenderer";

// Excel 渲染器
export {
  default as ExcelRenderer,
  ExcelRenderer as ExcelRendererComponent,
} from "./ExcelRenderer";
export type { ExcelRendererProps } from "./ExcelRenderer";

// JSON 渲染器
export {
  default as JsonRenderer,
  JsonRenderer as JsonRendererComponent,
} from "./JsonRenderer";
export type { JsonRendererProps } from "./JsonRenderer";

// JSONL 渲染器
export {
  default as JsonlRenderer,
  JsonlRenderer as JsonlRendererComponent,
} from "./JsonlRenderer";
export type { JsonlRendererProps } from "./JsonlRenderer";
