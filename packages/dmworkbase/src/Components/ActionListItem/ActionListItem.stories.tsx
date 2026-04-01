import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { IconPlus, IconSearch, IconChevronRight, IconSetting } from "@douyinfe/semi-icons";

function IconJoinSpace() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
    );
}

function IconCreateSpace() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}
import ActionListItem from "./index";
import "../../theme/index.css";

// compact variant story helper
const CompactContainer = ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: 220, background: "var(--wk-bg-surface)", borderRadius: 14, padding: "8px" }}>
        {children}
    </div>
);

const meta: Meta<typeof ActionListItem> = {
    title: "Base/ActionListItem",
    component: ActionListItem,
    parameters: { layout: "centered" },
    argTypes: {
        variant: { control: "select", options: ["join", "create", "default"] },
    },
    decorators: [
        (Story) => (
            <div style={{ width: 280, background: "var(--wk-bg-surface)", borderRadius: 12, padding: "8px 8px" }}>
                <Story />
            </div>
        ),
    ],
};
export default meta;
type Story = StoryObj<typeof ActionListItem>;

export const Join: Story = {
    args: {
        icon: <IconSearch />,
        label: "加入 Space",
        desc: "通过邀请码或链接加入",
        variant: "join",
        trailing: <IconChevronRight />,
    },
};

export const Create: Story = {
    args: {
        icon: <IconPlus />,
        label: "创建 Space",
        desc: "新建你自己的工作空间",
        variant: "create",
        trailing: <IconChevronRight />,
    },
};

export const Default: Story = {
    args: {
        icon: <IconSetting />,
        label: "设置",
        variant: "default",
    },
};

export const AllVariants: Story = {
    render: () => (
        <div style={{ width: 280, background: "var(--wk-bg-surface)", borderRadius: 12, padding: "4px 8px" }}>
            <ActionListItem
                icon={<IconSearch />}
                label="加入 Space"
                desc="通过邀请码或链接加入"
                variant="join"
                trailing={<IconChevronRight />}
            />
            <ActionListItem
                icon={<IconPlus />}
                label="创建 Space"
                desc="新建你自己的工作空间"
                variant="create"
                trailing={<IconChevronRight />}
            />
            <ActionListItem
                icon={<IconSetting />}
                label="设置"
                variant="default"
            />
        </div>
    ),
};

export const CompactVariants: Story = {
    name: "Compact（NavRail Space 弹窗）",
    render: () => (
        <CompactContainer>
            <ActionListItem
                icon={<IconJoinSpace />}
                label="加入 Space"
                variant="join"
                compact
            />
            <ActionListItem
                icon={<IconCreateSpace />}
                label="创建 Space"
                variant="create"
                compact
            />
        </CompactContainer>
    ),
};
