import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useState } from "react";
import { HtmlRenderer } from "./HtmlRenderer";
import { FilePreviewInfo } from "../types";
import "../../../theme/index.css";

// Base64 编码辅助函数
function btoaUnicode(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

/** 基础 HTML 文件 */
const basicHtmlFile: FilePreviewInfo = {
  url:
    "data:text/html;base64," +
    btoaUnicode(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hello HTML</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #2563eb; }
    .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Hello HTML Preview</h1>
  <p>这是一个 <span class="highlight">HTML 文件预览</span> 演示。</p>
  <h2>Features</h2>
  <ul>
    <li>支持 CSS 样式</li>
    <li>支持 <code>JavaScript</code> 交互</li>
    <li>沙箱隔离确保安全</li>
  </ul>
  <h2>代码示例</h2>
  <pre><code>const message = 'Hello World';
console.log(message);</code></pre>
</body>
</html>`),
  name: "index.html",
  extension: "html",
  size: 1024,
};

/** 带交互的 HTML */
const interactiveHtmlFile: FilePreviewInfo = {
  url:
    "data:text/html;base64," +
    btoaUnicode(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Interactive HTML</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    h1 { margin: 0 0 16px; color: #1f2937; }
    p { color: #6b7280; margin: 0 0 24px; }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    button:active { transform: translateY(0); }
    #counter {
      font-size: 48px;
      font-weight: bold;
      color: #3b82f6;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>计数器示例</h1>
    <p>点击按钮增加计数</p>
    <div id="counter">0</div>
    <button onclick="increment()">点击 +1</button>
  </div>
  <script>
    let count = 0;
    function increment() {
      count++;
      document.getElementById('counter').textContent = count;
    }
  </script>
</body>
</html>`),
  name: "interactive.html",
  extension: "html",
  size: 1536,
};

/** 复杂布局 HTML */
const complexLayoutHtmlFile: FilePreviewInfo = {
  url:
    "data:text/html;base64," +
    btoaUnicode(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Dashboard Layout</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f3f4f6;
    }
    .header {
      background: #1f2937;
      color: white;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 20px; }
    .nav { display: flex; gap: 16px; }
    .nav a { color: #9ca3af; text-decoration: none; }
    .nav a:hover { color: white; }
    .container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .card h3 { color: #374151; margin-bottom: 8px; }
    .card .value { font-size: 32px; font-weight: bold; color: #3b82f6; }
    .card .label { color: #6b7280; font-size: 14px; }
    .card.full { grid-column: span 3; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; }
    th { color: #6b7280; font-weight: 500; }
    .status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .status.active { background: #d1fae5; color: #059669; }
    .status.pending { background: #fef3c7; color: #d97706; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Dashboard</h1>
    <nav class="nav">
      <a href="#">首页</a>
      <a href="#">分析</a>
      <a href="#">设置</a>
    </nav>
  </div>
  <div class="container">
    <div class="card">
      <h3>总用户数</h3>
      <div class="value">12,847</div>
      <div class="label">↑ 12% 较上月</div>
    </div>
    <div class="card">
      <h3>活跃用户</h3>
      <div class="value">8,421</div>
      <div class="label">↑ 8% 较上月</div>
    </div>
    <div class="card">
      <h3>转化率</h3>
      <div class="value">3.2%</div>
      <div class="label">↓ 0.5% 较上月</div>
    </div>
    <div class="card full">
      <h3>最近订单</h3>
      <table>
        <thead>
          <tr><th>订单号</th><th>客户</th><th>金额</th><th>状态</th></tr>
        </thead>
        <tbody>
          <tr><td>#12345</td><td>张三</td><td>¥299</td><td><span class="status active">已完成</span></td></tr>
          <tr><td>#12346</td><td>李四</td><td>¥599</td><td><span class="status pending">处理中</span></td></tr>
          <tr><td>#12347</td><td>王五</td><td>¥199</td><td><span class="status active">已完成</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`),
  name: "dashboard.html",
  extension: "html",
  size: 2048,
};

/** 简单 HTML（源码查看） */
const simpleHtmlFile: FilePreviewInfo = {
  url:
    "data:text/html;base64," +
    btoaUnicode(`<!DOCTYPE html>
<html>
<head>
  <title>Simple Page</title>
</head>
<body>
  <h1>Hello World</h1>
  <p>This is a simple HTML page.</p>
</body>
</html>`),
  name: "simple.html",
  extension: "html",
  size: 256,
};

/** 可能产生错误的 HTML（用于演示错误处理） */
const errorProneHtmlFile: FilePreviewInfo = {
  url:
    "data:text/html;base64," +
    btoaUnicode(`<!DOCTYPE html>
<html>
<head>
  <title>Error Demo</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .error-box { background: #fee2e2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; color: #dc2626; }
  </style>
</head>
<body>
  <h1>错误演示页面</h1>
  <p>此页面包含一些可能触发错误的代码。</p>
  <div class="error-box">
    <strong>注意：</strong>这是一个正常显示的 HTML 页面。
    如果发生渲染错误，系统会自动切换到源码模式并显示红色错误提示条。
  </div>
  <script>
    // 这里可以模拟一些错误场景
    console.log('HTML loaded successfully');
  </script>
</body>
</html>`),
  name: "error-demo.html",
  extension: "html",
  size: 512,
};

const meta: Meta<typeof HtmlRenderer> = {
  title: "Components/FilePreviewPanel/HtmlRenderer",
  component: HtmlRenderer,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
HTML 渲染器，支持预览/源码切换和错误自动切源码功能。

## 功能

- **预览模式**：iframe 沙箱渲染，支持 CSS 和 JavaScript
- **源码模式**：HTML 语法高亮 + 行号
- **错误处理**：iframe 渲染出错时自动切换到源码模式，并显示红色错误提示条

## 沙箱策略

\`<iframe sandbox="allow-scripts allow-same-origin">\`

- 允许执行 JavaScript
- 禁止访问父页面 DOM
- 禁止携带父站点 cookie 跨域请求
- 不开放 \`allow-top-navigation\`，防止 iframe 内跳转劫持父窗

## 交互逻辑

1. 默认显示预览模式
2. 可通过工具栏切换到源码模式
3. 渲染出错时自动切换到源码模式并显示错误提示
4. 错误提示条支持「重试预览」按钮
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          height: "600px",
          border: "1px solid var(--wk-border-default)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof HtmlRenderer>;

// 默认状态
export const Default: Story = {
  args: {
    file: basicHtmlFile,
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story: "默认状态：基础 HTML 预览。",
      },
    },
  },
};

// 基础预览（Default 别名）
export const BasicPreview: Story = {
  ...Default,
  parameters: {
    docs: {
      description: {
        story:
          "基础 HTML 预览，展示标题、列表、代码块等基本元素，以及 CSS 样式。",
      },
    },
  },
};

// 交互式 HTML
export const InteractiveHtml: Story = {
  args: {
    file: interactiveHtmlFile,
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story:
          "带有 JavaScript 交互的 HTML 页面，展示计数器功能。沙箱允许执行脚本。",
      },
    },
  },
};

// 复杂布局
export const ComplexLayout: Story = {
  args: {
    file: complexLayoutHtmlFile,
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story: "复杂的 Dashboard 布局，展示 Grid 布局、表格、卡片等 UI 组件。",
      },
    },
  },
};

// 源码模式
export const SourceMode: Story = {
  args: {
    file: simpleHtmlFile,
    viewMode: "source",
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story: "源码模式，显示原始 HTML 代码，带语法高亮和行号。",
      },
    },
  },
};

// 预览/源码切换
const ViewModeTemplate: React.FC = () => {
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--wk-border-default)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--wk-bg-surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            background: "var(--wk-bg-hover)",
            borderRadius: "4px",
            padding: "2px",
          }}
        >
          <button
            onClick={() => setViewMode("preview")}
            style={{
              padding: "6px 12px",
              borderRadius: "3px",
              border: "none",
              background:
                viewMode === "preview" ? "var(--wk-bg-surface)" : "transparent",
              color:
                viewMode === "preview"
                  ? "var(--wk-text-primary)"
                  : "var(--wk-text-secondary)",
              cursor: "pointer",
              fontWeight: viewMode === "preview" ? 500 : 400,
            }}
          >
            预览
          </button>
          <button
            onClick={() => setViewMode("source")}
            style={{
              padding: "6px 12px",
              borderRadius: "3px",
              border: "none",
              background:
                viewMode === "source" ? "var(--wk-bg-surface)" : "transparent",
              color:
                viewMode === "source"
                  ? "var(--wk-text-primary)"
                  : "var(--wk-text-secondary)",
              cursor: "pointer",
              fontWeight: viewMode === "source" ? 500 : 400,
            }}
          >
            源码
          </button>
        </div>
        <span style={{ fontSize: "13px", color: "var(--wk-text-secondary)" }}>
          当前模式: {viewMode === "preview" ? "预览" : "源码"}
        </span>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <HtmlRenderer
          file={basicHtmlFile}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
    </div>
  );
};

export const ViewModeToggle: Story = {
  render: () => <ViewModeTemplate />,
  parameters: {
    docs: {
      description: {
        story: "预览/源码模式切换演示，展示两种视图的切换效果。",
      },
    },
  },
};

// 错误处理演示
export const ErrorHandling: Story = {
  args: {
    file: errorProneHtmlFile,
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story: `
错误处理演示页面。当 iframe 渲染出错时：
1. 自动切换到源码模式
2. 顶部显示红色错误提示条
3. 提供「重试预览」按钮

注意：此示例中的 HTML 是正常的，只是用于展示错误处理的 UI 设计。
        `,
      },
    },
  },
};

// 模拟错误状态
const ErrorStateTemplate: React.FC = () => {
  const [viewMode, setViewMode] = useState<"preview" | "source">("source");
  const [showError, setShowError] = useState(true);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--wk-border-default)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          background: "var(--wk-bg-surface)",
        }}
      >
        <span style={{ fontSize: "13px", color: "var(--wk-text-secondary)" }}>
          模拟错误状态（已自动切换到源码模式）
        </span>
        <button
          onClick={() => {
            setShowError(false);
            setViewMode("preview");
          }}
          style={{
            padding: "6px 12px",
            borderRadius: "4px",
            border: "1px solid var(--wk-border-default)",
            background: "var(--wk-bg-base)",
            cursor: "pointer",
          }}
        >
          重置状态
        </button>
      </div>
      {showError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "#fef2f2",
            borderBottom: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: "14px",
          }}
        >
          <span>⚠</span>
          <span style={{ flex: 1 }}>HTML 渲染失败，已切换到源码视图</span>
          <button
            onClick={() => {
              setShowError(false);
              setViewMode("preview");
            }}
            style={{
              padding: "4px 12px",
              border: "1px solid #fecaca",
              background: "transparent",
              color: "#dc2626",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            重试预览
          </button>
        </div>
      )}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <HtmlRenderer
          file={basicHtmlFile}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
    </div>
  );
};

export const SimulatedErrorState: Story = {
  render: () => <ErrorStateTemplate />,
  parameters: {
    docs: {
      description: {
        story: "模拟错误状态的 UI 展示，演示错误提示条和重试按钮的交互效果。",
      },
    },
  },
};

// 空内容
export const EmptyContent: Story = {
  args: {
    file: {
      url: "data:text/html;base64," + btoaUnicode(""),
      name: "empty.html",
      extension: "html",
      size: 0,
    },
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story: "空内容的 HTML 文件，显示「暂无内容」提示。",
      },
    },
  },
};
