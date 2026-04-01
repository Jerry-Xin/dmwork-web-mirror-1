import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import NavRail from "./index";
import type { NavRailProps } from "./index";

const mockSpaces = [
    { space_id: "s1", name: "明略科技", logo: "", member_count: 8, max_users: 50 },
    { space_id: "s2", name: "产品团队", logo: "", member_count: 3, max_users: 10 },
    { space_id: "s3", name: "研发中心", logo: "", member_count: 20, max_users: 0 },
] as any[];

const defaultArgs: NavRailProps = {
    spaces: mockSpaces,
    currentSpaceId: "s1",
    activeItem: "messages",
    userName: "张三",
    unreadCount: 0,
    onSpaceSelect: (id) => console.log("space selected:", id),
    onItemClick: (key) => console.log("nav item clicked:", key),
    onJoinSpace: () => console.log("join space"),
    onCreateSpace: () => console.log("create space"),
    onSettingsClick: () => console.log("settings"),
    onAvatarClick: () => console.log("avatar"),
};

const meta: Meta<typeof NavRail> = {
    title: "Navigation/NavRail",
    component: NavRail,
    parameters: {
        layout: "fullscreen",
        backgrounds: {
            default: "dark",
            values: [
                { name: "dark", value: "#111318" },
                { name: "light", value: "#f5f5f5" },
            ],
        },
    },
    decorators: [
        (Story) => (
            <div style={{ display: "flex", height: "100vh" }}>
                <Story />
                <div style={{ flex: 1, background: "var(--wk-bg-base, #171921)" }} />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof NavRail>;

export const Default: Story = {
    args: defaultArgs,
};

export const WithBadge: Story = {
    args: { ...defaultArgs, unreadCount: 5 },
};

export const WithLargeBadge: Story = {
    args: { ...defaultArgs, unreadCount: 120 },
};

export const MultipleSpaces: Story = {
    args: { ...defaultArgs, currentSpaceId: "s2" },
};

export const NoSpaces: Story = {
    args: { ...defaultArgs, spaces: [], currentSpaceId: undefined },
};
