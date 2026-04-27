import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useState } from "react";
import { FilePreviewHeader, ConversationFile } from "./FilePreviewHeader";
import { FilePreviewInfo } from "./types";
import "../../theme/index.css";

/** Mock 文件列表（Storybook 专用） */
const MOCK_CONVERSATION_FILES: ConversationFile[] = [
  {
    id: "1",
    name: "项目需求文档.pdf",
    extension: "pdf",
    url: "https://example.com/doc.pdf",
    size: 2048000,
    isAiGenerated: false,
  },
  {
    id: "2",
    name: "数据分析报告.xlsx",
    extension: "xlsx",
    url: "https://example.com/report.xlsx",
    size: 512000,
    isAiGenerated: true,
  },
  {
    id: "3",
    name: "screenshot_2024.png",
    extension: "png",
    url: "https://example.com/screenshot.png",
    size: 1024000,
    isAiGenerated: false,
  },
  {
    id: "4",
    name: "api-response.json",
    extension: "json",
    url: "https://example.com/api.json",
    size: 4096,
    isAiGenerated: true,
  },
  {
    id: "5",
    name: "utils.ts",
    extension: "ts",
    url: "https://example.com/utils.ts",
    size: 8192,
    isAiGenerated: true,
  },
  {
    id: "6",
    name: "会议录音.mp3",
    extension: "mp3",
    url: "https://example.com/meeting.mp3",
    size: 10240000,
    isAiGenerated: false,
  },
];

const mockFile: FilePreviewInfo = {
  url: "https://example.com/doc.pdf",
  name: "项目需求文档.pdf",
  extension: "pdf",
  size: 2048000,
};

const meta: Meta<typeof FilePreviewHeader> = {
  title: "Components/FilePreviewHeader",
  component: FilePreviewHeader,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
文件预览面板统一 Header 组件

## 功能
- 文件名显示 + 文件类型图标
- 文件列表下拉选择器（hover 浮窗 / 点击展开侧边面板）
- 视图切换（预览/源码）
- 操作按钮（全屏、新标签打开、回复、下载、关闭）

## 交互逻辑
1. 侧边面板关闭时：hover 文件选择器显示浮窗下拉列表
2. 点击文件选择器：切换侧边文件列表面板的展开/收起
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: "480px",
          background: "var(--wk-bg-surface)",
          borderRadius: "8px",
          boxShadow: "var(--wk-shadow-md)",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FilePreviewHeader>;

// 基础用法
export const Default: Story = {
  args: {
    file: mockFile,
    onClose: () => console.log("Close clicked"),
  },
};

// 带文件列表
export const WithFileList: Story = {
  args: {
    file: mockFile,
    conversationFiles: MOCK_CONVERSATION_FILES,
    onClose: () => console.log("Close clicked"),
    onFileSelect: (file) => console.log("Selected:", file.name),
  },
  parameters: {
    docs: {
      description: {
        story: "带文件列表的 Header，hover 时显示下拉浮窗。",
      },
    },
  },
};

// 带视图切换
const ViewToggleTemplate = () => {
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");

  return (
    <FilePreviewHeader
      file={{ ...mockFile, extension: "html", name: "index.html" }}
      onClose={() => console.log("Close clicked")}
      showViewToggle
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
};

export const WithViewToggle: Story = {
  render: () => <ViewToggleTemplate />,
  parameters: {
    docs: {
      description: {
        story: "带预览/源码视图切换的 Header，适用于 HTML、PPT 等类型。",
      },
    },
  },
};

// 带侧边面板状态
const WithFilePanelTemplate = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div>
      <FilePreviewHeader
        file={mockFile}
        conversationFiles={MOCK_CONVERSATION_FILES}
        onClose={() => console.log("Close clicked")}
        onFileSelect={(file) => console.log("Selected:", file.name)}
        isFilePanelOpen={isPanelOpen}
        onFilePanelToggle={() => setIsPanelOpen(!isPanelOpen)}
      />
      <div
        style={{
          padding: "12px 16px",
          fontSize: "12px",
          color: "var(--wk-text-secondary)",
        }}
      >
        侧边面板状态: {isPanelOpen ? "展开" : "收起"}（点击文件名切换）
      </div>
    </div>
  );
};

export const WithFilePanel: Story = {
  render: () => <WithFilePanelTemplate />,
  parameters: {
    docs: {
      description: {
        story: "带侧边文件列表面板状态的 Header，点击文件名切换面板展开/收起。",
      },
    },
  },
};

// 完整功能
export const FullFeatures: Story = {
  args: {
    file: { ...mockFile, extension: "html", name: "report.html" },
    conversationFiles: MOCK_CONVERSATION_FILES,
    onClose: () => console.log("Close clicked"),
    onFileSelect: (file) => console.log("Selected:", file.name),
    onDownload: () => console.log("Download clicked"),
    onOpenExternal: () => console.log("Open external clicked"),
    onFullscreen: () => console.log("Fullscreen clicked"),
    onReply: () => console.log("Reply clicked"),
    showViewToggle: true,
    viewMode: "preview",
    onViewModeChange: (mode) => console.log("View mode:", mode),
  },
  parameters: {
    docs: {
      description: {
        story: "完整功能的 Header，包含所有操作按钮和视图切换。",
      },
    },
  },
};

// 长文件名
export const LongFileName: Story = {
  args: {
    file: {
      ...mockFile,
      name: "this-is-a-very-long-file-name-that-should-be-truncated-with-ellipsis.pdf",
    },
    onClose: () => console.log("Close clicked"),
  },
  parameters: {
    docs: {
      description: {
        story: "长文件名会被截断显示省略号。",
      },
    },
  },
};

// 无文件列表（单文件）
export const SingleFile: Story = {
  args: {
    file: mockFile,
    conversationFiles: [],
    onClose: () => console.log("Close clicked"),
  },
  parameters: {
    docs: {
      description: {
        story: "单文件模式，不显示下拉箭头和文件列表。",
      },
    },
  },
};
