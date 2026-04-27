import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
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

/** 基础 Markdown 文件 */
const basicMarkdownFile: FilePreviewInfo = {
  url:
    "data:text/plain;base64," +
    btoaUnicode(`# Hello Markdown

This is a **Markdown** file preview demo.

## Features

- List item 1
- List item 2
- List item 3

## Code Example

\`\`\`javascript
function hello() {
  console.log('Hello World');
}
\`\`\`

## Links

[Link example](https://example.com)
`),
  name: "README.md",
  extension: "md",
  size: 512,
};

/** 带 TOC 的 Markdown 文件（h2 ≥ 3） */
const markdownWithTocFile: FilePreviewInfo = {
  url:
    "data:text/plain;base64," +
    btoaUnicode(`# 项目文档

这是一个带有多个章节的 Markdown 文档，用于演示 TOC（目录）功能。

## 简介

项目简介内容，描述项目的基本信息和目标。

### 背景

项目背景说明，解释为什么需要这个项目。

### 目标

1. 目标一：提升用户体验
2. 目标二：优化性能
3. 目标三：增强安全性

## 快速开始

本章节介绍如何快速上手使用本项目。

### 环境要求

- Node.js >= 16
- pnpm >= 8.0
- Git

### 安装步骤

\`\`\`bash
# 克隆仓库
git clone https://github.com/example/project.git

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
\`\`\`

## 使用指南

详细的使用说明和最佳实践。

### 基础用法

基础用法示例代码：

\`\`\`typescript
import { Component } from 'project';

const app = new Component({
  name: 'MyApp',
  version: '1.0.0'
});

app.start();
\`\`\`

### 高级配置

高级配置选项说明：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| debug | boolean | false | 是否开启调试模式 |
| timeout | number | 3000 | 请求超时时间（ms） |
| retries | number | 3 | 重试次数 |

## API 参考

完整的 API 文档。

### Component 类

主要组件类的详细说明。

#### 构造函数

\`\`\`typescript
constructor(options: ComponentOptions)
\`\`\`

#### 方法

- \`start()\`: 启动组件
- \`stop()\`: 停止组件
- \`restart()\`: 重启组件

## 常见问题

常见问题解答（FAQ）。

### Q: 如何解决安装失败？

A: 请检查 Node.js 版本是否满足要求，并尝试清除 node_modules 后重新安装。

### Q: 如何报告 Bug？

A: 请在 GitHub Issues 中提交，并附上详细的复现步骤和环境信息。

## 更新日志

### v1.0.0 (2024-01-15)

- 初始版本发布
- 支持基础功能
- 完善文档

### v0.9.0 (2024-01-01)

- Beta 版本
- 功能测试
`),
  name: "DOCUMENTATION.md",
  extension: "md",
  size: 2048,
};

/** 简短 Markdown（不显示 TOC） */
const shortMarkdownFile: FilePreviewInfo = {
  url:
    "data:text/plain;base64," +
    btoaUnicode(`# 简短文档

这是一个简短的文档，只有一个 h2 标题。

## 唯一的章节

内容很少，不需要目录导航。
`),
  name: "SHORT.md",
  extension: "md",
  size: 128,
};

/** 包含数学公式的 Markdown */
const mathMarkdownFile: FilePreviewInfo = {
  url:
    "data:text/plain;base64," +
    btoaUnicode(`# 数学公式示例

本文档演示 KaTeX 数学公式渲染功能。

## 行内公式

爱因斯坦质能方程：$E = mc^2$

二次方程求根公式：$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

欧拉恒等式：$e^{i\\pi} + 1 = 0$

## 块级公式

高斯积分：

$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

麦克斯韦方程组：

$$\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}$$

$$\\nabla \\cdot \\mathbf{B} = 0$$

$$\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}$$

$$\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}$$

## 矩阵

$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}$$

## 求和与极限

泰勒级数：

$$e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}$$

极限定义：

$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$
`),
  name: "MATH_EXAMPLES.md",
  extension: "md",
  size: 1024,
};

/** 代码丰富的 Markdown */
const codeHeavyMarkdownFile: FilePreviewInfo = {
  url:
    "data:text/plain;base64," +
    btoaUnicode(`# 代码示例集合

展示各种编程语言的代码高亮效果。

## JavaScript

\`\`\`javascript
// ES6+ 特性示例
const greet = (name) => \`Hello, \${name}!\`;

class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  introduce() {
    return \`I'm \${this.name}, \${this.age} years old.\`;
  }
}

const person = new Person('Alice', 30);
console.log(person.introduce());
\`\`\`

## TypeScript

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

function createUser(data: Partial<User>): User {
  return {
    id: Date.now(),
    name: data.name ?? 'Anonymous',
    email: data.email ?? '',
    role: data.role ?? 'guest',
  };
}
\`\`\`

## Python

\`\`\`python
from typing import List, Optional

class DataProcessor:
    def __init__(self, data: List[dict]):
        self.data = data

    def filter_by_key(self, key: str, value: any) -> List[dict]:
        return [item for item in self.data if item.get(key) == value]

    def transform(self, func) -> 'DataProcessor':
        self.data = [func(item) for item in self.data]
        return self

# 使用示例
processor = DataProcessor([{'name': 'Alice'}, {'name': 'Bob'}])
result = processor.filter_by_key('name', 'Alice')
\`\`\`

## SQL

\`\`\`sql
-- 创建用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 查询活跃用户
SELECT u.username, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.username
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC;
\`\`\`
`),
  name: "CODE_EXAMPLES.md",
  extension: "md",
  size: 1536,
};

const meta: Meta<typeof MarkdownRenderer> = {
  title: "Components/FilePreviewPanel/MarkdownRenderer",
  component: MarkdownRenderer,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
Markdown 渲染器，支持预览/源码切换和 TOC 目录功能。

## 功能

- **预览模式**：GFM 渲染，支持表格、任务列表、代码块语法高亮
- **源码模式**：Markdown 语法高亮 + 行号
- **目录 (TOC)**：当 h2 标题 ≥ 3 个时显示，支持 h2/h3 层级
- **视图记忆**：不跨文件，每次打开默认预览模式

## 交互逻辑

1. 默认显示预览模式
2. 切换到源码模式时，TOC 自动关闭
3. 点击 TOC 项目滚动到对应位置
4. 滚动时自动高亮当前章节
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
type Story = StoryObj<typeof MarkdownRenderer>;

// 默认状态
export const Default: Story = {
  args: {
    file: basicMarkdownFile,
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story: "默认状态：基础 Markdown 预览。",
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
        story: "基础 Markdown 预览，展示标题、列表、代码块等基本元素。",
      },
    },
  },
};

// 带 TOC 的文档
export const WithToc: Story = {
  args: {
    file: markdownWithTocFile,
    isTocOpen: true,
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story:
          "带有 TOC 目录的长文档。当 h2 标题 ≥ 3 个时，左侧显示目录侧边栏。",
      },
    },
  },
};

// TOC 交互演示
const TocInteractiveTemplate: React.FC = () => {
  const [isTocOpen, setIsTocOpen] = useState(true);
  const [tocAvailable, setTocAvailable] = useState(false);

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
        <button
          onClick={() => setIsTocOpen(!isTocOpen)}
          disabled={!tocAvailable}
          style={{
            padding: "6px 12px",
            borderRadius: "4px",
            border: "1px solid var(--wk-border-default)",
            background: isTocOpen
              ? "var(--wk-brand-primary-bg)"
              : "var(--wk-bg-base)",
            color: isTocOpen
              ? "var(--wk-brand-primary)"
              : "var(--wk-text-primary)",
            cursor: tocAvailable ? "pointer" : "not-allowed",
            opacity: tocAvailable ? 1 : 0.5,
          }}
        >
          {isTocOpen ? "收起目录" : "展开目录"}
        </button>
        <span style={{ fontSize: "13px", color: "var(--wk-text-secondary)" }}>
          TOC 可用: {tocAvailable ? "是" : "否"}
        </span>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <MarkdownRenderer
          file={markdownWithTocFile}
          isTocOpen={isTocOpen}
          onTocToggle={() => setIsTocOpen(!isTocOpen)}
          onTocAvailableChange={setTocAvailable}
        />
      </div>
    </div>
  );
};

export const TocInteractive: Story = {
  render: () => <TocInteractiveTemplate />,
  parameters: {
    docs: {
      description: {
        story: "交互式 TOC 演示，可以切换目录的展开/收起状态。",
      },
    },
  },
};

// 预览/源码切换
const ViewModeTemplate: React.FC = () => {
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const [isTocOpen, setIsTocOpen] = useState(false);

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
        <MarkdownRenderer
          file={codeHeavyMarkdownFile}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isTocOpen={isTocOpen}
          onTocToggle={() => setIsTocOpen(!isTocOpen)}
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
        story: "预览/源码模式切换演示，源码模式使用 Markdown 语法高亮。",
      },
    },
  },
};

// 源码模式
export const SourceMode: Story = {
  args: {
    file: basicMarkdownFile,
    viewMode: "source",
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story: "源码模式，显示原始 Markdown 文本，带语法高亮和行号。",
      },
    },
  },
};

// 简短文档（无 TOC）
export const ShortDocument: Story = {
  args: {
    file: shortMarkdownFile,
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story: "简短的文档（h2 < 3），不显示 TOC 按钮。",
      },
    },
  },
};

// 代码丰富的文档
export const CodeHeavyDocument: Story = {
  args: {
    file: codeHeavyMarkdownFile,
    isTocOpen: true,
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story: "包含多种编程语言代码块的文档，展示语法高亮效果。",
      },
    },
  },
};

// 数学公式
export const MathFormulas: Story = {
  args: {
    file: mathMarkdownFile,
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story:
          "包含 KaTeX 数学公式的文档，支持行内公式 `$...$` 和块级公式 `$$...$$`。",
      },
    },
  },
};

// 空内容
export const EmptyContent: Story = {
  args: {
    file: {
      url: "data:text/plain;base64," + btoaUnicode(""),
      name: "empty.md",
      extension: "md",
      size: 0,
    },
    onError: (error) => console.error("Error:", error),
  },
  parameters: {
    docs: {
      description: {
        story: "空内容的 Markdown 文件，显示「暂无内容」提示。",
      },
    },
  },
};
