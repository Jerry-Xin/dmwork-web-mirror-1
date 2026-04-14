import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { BaseRendererProps, getLanguageFromExtension } from "../types";
import { useFileContent } from "../hooks/useFileContent";
import "./CodeRenderer.css";

export interface CodeRendererProps extends BaseRendererProps {}

// 自定义代码高亮主题 - 参考 dm__test 的设计
const codeTheme = {
  hljs: {
    display: "block",
    overflowX: "auto",
    padding: "1em",
    background: "var(--wk-bg-base)",
    color: "var(--wk-text-primary)",
    fontSize: "13px",
    fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
    lineHeight: "1.6",
  },

  // 注释和文档字符串
  "hljs-comment": {
    color: "#9c9cab",
    fontStyle: "italic",
  },
  "hljs-quote": {
    color: "#9c9cab",
    fontStyle: "italic",
  },

  // 关键词、控制结构、操作符
  "hljs-keyword": {
    color: "#7171ee",
    fontWeight: "bold",
  },
  "hljs-selector-tag": {
    color: "#7171ee",
    fontWeight: "bold",
  },
  "hljs-literal": {
    color: "#7171ee",
  },

  // 类型、class 名、定义名
  "hljs-title": {
    color: "#4455aa",
    fontWeight: "bold",
  },
  "hljs-section": {
    color: "#4455aa",
  },
  "hljs-type": {
    color: "#4455aa",
  },

  // 属性名、参数、标签名
  "hljs-name": {
    color: "#2a3daa",
  },
  "hljs-attribute": {
    color: "#2a3daa",
  },
  "hljs-params": {
    color: "#2a3daa",
  },

  // 字符串、模板字符串
  "hljs-string": {
    color: "#2baf8a",
  },
  "hljs-template-variable": {
    color: "#2baf8a",
  },
  "hljs-doctag": {
    color: "#2baf8a",
  },

  // 数值、布尔
  "hljs-number": {
    color: "#c66",
  },

  // 正则、符号、链接
  "hljs-regexp": {
    color: "#c973d9",
  },
  "hljs-symbol": {
    color: "#c973d9",
  },
  "hljs-link": {
    color: "#c973d9",
  },

  // 变量
  "hljs-variable": {
    color: "#448899",
  },

  // 插入、删除背景
  "hljs-addition": {
    backgroundColor: "#ddffdd",
  },
  "hljs-deletion": {
    backgroundColor: "#ffeef0",
  },

  // 元信息、装饰器
  "hljs-meta": {
    color: "#999",
    fontStyle: "italic",
  },

  // 强调类
  "hljs-emphasis": {
    fontStyle: "italic",
  },
  "hljs-strong": {
    fontWeight: "bold",
  },
};

// 暗色主题
const codeDarkTheme = {
  ...codeTheme,
  hljs: {
    ...codeTheme.hljs,
    background: "#1a1a1a",
    color: "#e0e0e0",
  },

  "hljs-comment": {
    color: "#6a6a7a",
    fontStyle: "italic",
  },
  "hljs-quote": {
    color: "#6a6a7a",
    fontStyle: "italic",
  },

  "hljs-keyword": {
    color: "#9d8cff",
    fontWeight: "bold",
  },
  "hljs-selector-tag": {
    color: "#9d8cff",
    fontWeight: "bold",
  },
  "hljs-literal": {
    color: "#9d8cff",
  },

  "hljs-title": {
    color: "#7aa2f7",
    fontWeight: "bold",
  },
  "hljs-section": {
    color: "#7aa2f7",
  },
  "hljs-type": {
    color: "#7aa2f7",
  },

  "hljs-name": {
    color: "#7dcfff",
  },
  "hljs-attribute": {
    color: "#7dcfff",
  },
  "hljs-params": {
    color: "#7dcfff",
  },

  "hljs-string": {
    color: "#9ece6a",
  },
  "hljs-template-variable": {
    color: "#9ece6a",
  },
  "hljs-doctag": {
    color: "#9ece6a",
  },

  "hljs-number": {
    color: "#ff9e64",
  },

  "hljs-regexp": {
    color: "#bb9af7",
  },
  "hljs-symbol": {
    color: "#bb9af7",
  },
  "hljs-link": {
    color: "#bb9af7",
  },

  "hljs-variable": {
    color: "#73daca",
  },

  "hljs-addition": {
    backgroundColor: "#1a3a1a",
  },
  "hljs-deletion": {
    backgroundColor: "#3a1a1a",
  },

  "hljs-meta": {
    color: "#666",
    fontStyle: "italic",
  },
};

/**
 * 代码渲染器
 * 使用 react-syntax-highlighter 实现语法高亮
 * 支持 js, jsx, ts, tsx, json, css, scss, less, html, xml, yaml, yml,
 * py, java, c, cpp, h, hpp, go, rs, rb, php, sh, bash, sql, vue, svelte 等格式
 */
const CodeRenderer: React.FC<CodeRendererProps> = ({ file, onError }) => {
  const { content, loading, error, reload } = useFileContent({
    url: file.url,
  });

  const language = getLanguageFromExtension(file.extension);

  // 检测当前主题模式
  const isDarkMode =
    typeof document !== "undefined" &&
    document.body.getAttribute("theme-mode") === "dark";

  if (loading) {
    return (
      <div className="wk-file-preview-code-renderer__loading">
        <div className="wk-file-preview-code-renderer__spinner" />
        <span>加载中...</span>
      </div>
    );
  }

  if (error) {
    onError?.(error);
    return (
      <div className="wk-file-preview-code-renderer__error">
        <span>{error}</span>
        <button
          className="wk-file-preview-code-renderer__retry"
          onClick={reload}
        >
          重试
        </button>
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="wk-file-preview-code-renderer__error">
        <span>暂无内容</span>
      </div>
    );
  }

  const code = content.replace(/\n$/, "");

  return (
    <div className="wk-file-preview-code-renderer">
      <SyntaxHighlighter
        language={language}
        style={(isDarkMode ? codeDarkTheme : codeTheme) as any}
        showLineNumbers
        lineNumberStyle={{
          minWidth: "3em",
          paddingRight: "1em",
          color: isDarkMode ? "#4a4a5a" : "#999",
          textAlign: "right",
          userSelect: "none",
        }}
        customStyle={{
          margin: 0,
          padding: "16px",
          background: isDarkMode ? "#1a1a1a" : "var(--wk-bg-base)",
          minHeight: "100%",
          boxSizing: "border-box",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
            fontSize: "13px",
            lineHeight: "1.6",
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeRenderer;
export { CodeRenderer };
