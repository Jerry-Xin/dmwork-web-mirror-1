import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useState } from "react";
import JoinSpaceModal, { JoinSpaceModalProps } from "./index";
import "../../theme/index.css";

const meta: Meta<typeof JoinSpaceModal> = {
    title: "Space/JoinSpaceModal",
    component: JoinSpaceModal,
    parameters: { layout: "centered" },
    args: {
        visible: true,
        onVerify: () => {},
        onJoin: () => {},
        onBack: () => {},
        onCancel: () => {},
        onCodeChange: () => {},
    },
};
export default meta;
type Story = StoryObj<typeof JoinSpaceModal>;

/** Step 1：输入邀请码 */
export const InputStep: Story = {
    name: "Step 1 — 输入邀请码",
    args: {
        step: "input",
        code: "",
    },
};

/** Step 1：输入中 */
export const InputWithCode: Story = {
    name: "Step 1 — 已输入邀请码",
    args: {
        step: "input",
        code: "ABC123",
    },
};

/** Step 1：验证中 */
export const InputVerifying: Story = {
    name: "Step 1 — 验证中",
    args: {
        step: "input",
        code: "ABC123",
        verifyLoading: true,
    },
};

/** Step 2：确认加入 */
export const ConfirmStep: Story = {
    name: "Step 2 — 确认加入",
    args: {
        step: "confirm",
        code: "ABC123",
        inviteInfo: {
            invite_code: "ABC123",
            space_id: "1",
            space_name: "明略科技",
            member_count: 8,
            max_users: 0,
        },
    },
};

/** Step 2：空间已满 */
export const ConfirmFull: Story = {
    name: "Step 2 — 空间已满",
    args: {
        step: "confirm",
        code: "XYZ789",
        inviteInfo: {
            invite_code: "XYZ789",
            space_id: "2",
            space_name: "test0311",
            member_count: 10,
            max_users: 10,
        },
    },
};

/** Step 2：加入中 */
export const ConfirmJoining: Story = {
    name: "Step 2 — 加入中",
    args: {
        step: "confirm",
        code: "ABC123",
        joinLoading: true,
        inviteInfo: {
            invite_code: "ABC123",
            space_id: "1",
            space_name: "明略科技",
            member_count: 8,
            max_users: 20,
        },
    },
};

/** 交互演示：两步切换 */
export const Interactive: Story = {
    name: "完整交互流程",
    render: () => {
        const [step, setStep] = React.useState<"input" | "confirm">("input");
        const [code, setCode] = React.useState("");
        const [visible, setVisible] = React.useState(true);

        return (
            <div>
                <button onClick={() => setVisible(true)} style={{ marginBottom: 12 }}>
                    打开弹窗
                </button>
                <JoinSpaceModal
                    visible={visible}
                    step={step}
                    code={code}
                    onCodeChange={setCode}
                    inviteInfo={step === "confirm" ? {
                        invite_code: code,
                        space_id: "1",
                        space_name: "明略科技",
                        member_count: 8,
                        max_users: 0,
                    } : undefined}
                    onVerify={() => code.trim() && setStep("confirm")}
                    onJoin={() => { setVisible(false); setStep("input"); setCode(""); }}
                    onBack={() => setStep("input")}
                    onCancel={() => { setVisible(false); setStep("input"); setCode(""); }}
                />
            </div>
        );
    },
};
