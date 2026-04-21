import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useState } from "react";
import ChannelPicker from "./index";
import type {
  ChannelPickerCategory,
  ChannelPickerItem,
  ChannelPickerProps,
} from "./index";

const categories: ChannelPickerCategory[] = [
  { id: "important", name: "重要工作", order: 1 },
  { id: "default-0", name: "默认分组", order: 2, isDefault: true },
];

const channels: ChannelPickerItem[] = [
  {
    channelId: "speech-strategy",
    channelType: 2,
    name: "语音转写策略讨论",
    categoryId: "important",
    unread: 8,
    mentionCount: 2,
    muted: false,
    lastMessageTime: 1713596400,
  },
  {
    channelId: "speech-thread-priority",
    channelType: 5,
    name: "高优先级问题",
    parentChannelId: "speech-strategy",
    unread: 1,
    mentionCount: 0,
    muted: false,
    lastMessageTime: 1713592800,
  },
  {
    channelId: "speech-thread-mobile",
    channelType: 5,
    name: "移动端相关",
    parentChannelId: "speech-strategy",
    unread: 0,
    mentionCount: 1,
    muted: false,
    lastMessageTime: 1713589200,
  },
  {
    channelId: "ft-a2-team",
    channelType: 2,
    name: "FT-A2 Team",
    categoryId: "important",
    unread: 12,
    mentionCount: 0,
    muted: false,
    lastMessageTime: 1713585600,
  },
  {
    channelId: "octo-native",
    channelType: 2,
    name: "Octo Native开发群",
    categoryId: "default-0",
    unread: 3,
    mentionCount: 0,
    muted: false,
    lastMessageTime: 1713582000,
  },
];

const privateChats: ChannelPickerItem[] = [
  {
    channelId: "alice",
    channelType: 1,
    name: "Alice",
    unread: 2,
    mentionCount: 0,
    muted: false,
    lastMessageTime: 1713598200,
  },
  {
    channelId: "octo-bot",
    channelType: 1,
    name: "Octo Bot",
    unread: 0,
    mentionCount: 0,
    muted: true,
    lastMessageTime: 1713578400,
    isBot: true,
  },
];

function SelectablePicker(args: ChannelPickerProps) {
  const [selectedId, setSelectedId] = useState(
    args.selectedId ?? "speech-strategy"
  );

  return (
    <ChannelPicker
      {...args}
      selectedId={selectedId}
      onSelect={(item) => {
        setSelectedId(item.channelId);
        args.onSelect(item);
      }}
    />
  );
}

const meta: Meta<typeof ChannelPicker> = {
  title: "Business/ChannelPicker",
  component: ChannelPicker,
  parameters: {
    docs: {
      description: {
        component: `
频道选择器，支持传统群聊/私聊 Tab 视图，也支持注入弹窗使用的单面板混排视图。

**Props：**
- \`channels\`：群聊与 Thread 列表
- \`privateChats\`：私聊列表
- \`categories\`：群聊分组
- \`layoutMode\`：\`tabbed\` 或 \`single-panel\`
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 420,
          padding: 16,
          background: "var(--wk-bg-app, #ffffff)",
          borderRadius: 16,
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    channels,
    categories,
    privateChats,
    selectedId: "speech-strategy",
    onSelect: () => {},
    loading: false,
    showSearch: true,
    layoutMode: "tabbed",
  },
};

export default meta;
type Story = StoryObj<typeof ChannelPicker>;

export const Default: Story = {
  name: "默认",
  render: (args) => <SelectablePicker {...args} />,
};

export const AllVariants: Story = {
  name: "所有布局",
  render: (args) => (
    <div style={{ display: "grid", gap: 16 }}>
      <SelectablePicker {...args} layoutMode="tabbed" />
      <SelectablePicker {...args} layoutMode="single-panel" />
    </div>
  ),
};

export const States: Story = {
  name: "状态",
  render: (args) => (
    <div style={{ display: "grid", gap: 16 }}>
      <ChannelPicker {...args} loading />
      <ChannelPicker
        {...args}
        channels={[]}
        categories={[]}
        privateChats={[]}
        layoutMode="single-panel"
      />
    </div>
  ),
};

export const EdgeCases: Story = {
  name: "边界情况",
  render: (args) => (
    <SelectablePicker
      {...args}
      layoutMode="single-panel"
      channels={[
        {
          channelId: "long-channel-name",
          channelType: 2,
          name: "这是一个非常非常长的频道名称，用来验证单行截断和高亮选中时的布局稳定性",
          categoryId: "default-0",
          unread: 128,
          mentionCount: 0,
          muted: false,
          lastMessageTime: 1713596400,
        },
        {
          channelId: "long-thread-name",
          channelType: 5,
          name: "超长 Thread 名称，用来验证缩进和连接线不会把文本挤坏",
          parentChannelId: "long-channel-name",
          unread: 0,
          mentionCount: 3,
          muted: false,
          lastMessageTime: 1713592800,
        },
      ]}
      privateChats={[
        {
          channelId: "very-long-person",
          channelType: 1,
          name: "非常非常长的联系人名称，用来验证私聊头像和尾部角标同时出现时的截断表现",
          unread: 99,
          mentionCount: 0,
          muted: false,
          lastMessageTime: 1713591000,
        },
      ]}
    />
  ),
};
