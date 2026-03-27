import React from "react";
import { Modal, Input } from "@douyinfe/semi-ui";
import "./index.css";

export interface InviteInfo {
    invite_code: string;
    space_id: string;
    space_name: string;
    member_count: number;
    max_users: number;
}

export type JoinStep = "input" | "confirm";

export interface JoinSpaceModalProps {
    visible: boolean;
    step: JoinStep;
    code: string;
    onCodeChange: (v: string) => void;
    inviteInfo?: InviteInfo;
    verifyLoading?: boolean;
    joinLoading?: boolean;
    onVerify: () => void;
    onJoin: () => void;
    onBack: () => void;
    onCancel: () => void;
}

export default function JoinSpaceModal({
    visible,
    step,
    code,
    onCodeChange,
    inviteInfo,
    verifyLoading = false,
    joinLoading = false,
    onVerify,
    onJoin,
    onBack,
    onCancel,
}: JoinSpaceModalProps) {
    const isFull =
        !!inviteInfo &&
        inviteInfo.max_users > 0 &&
        inviteInfo.member_count >= inviteInfo.max_users;

    return (
        <Modal
            title="加入 Space"
            visible={visible}
            onCancel={onCancel}
            footer={null}
            width={400}
            closable
        >
            {step === "input" && (
                <div className="wk-join-space-modal">
                    <p className="wk-join-space-modal__desc">
                        输入 Space 邀请码或邀请链接，加入一个已有的工作空间。
                    </p>
                    <div className="wk-join-space-modal__field">
                        <label className="wk-join-space-modal__label">邀请码</label>
                        <Input
                            size="large"
                            placeholder="例如：abc123 或 https://…/invite/abc123"
                            value={code}
                            onChange={onCodeChange}
                            onEnterPress={onVerify}
                            autoFocus
                        />
                        <span className="wk-join-space-modal__hint">
                            邀请码由 Space 管理员生成，通常为 6 位字母数字组合。
                        </span>
                    </div>
                    <div className="wk-join-space-modal__footer">
                        <button className="wk-join-space-modal__btn wk-join-space-modal__btn--cancel" onClick={onCancel}>
                            取消
                        </button>
                        <button
                            className="wk-join-space-modal__btn wk-join-space-modal__btn--confirm"
                            onClick={onVerify}
                            disabled={verifyLoading}
                        >
                            {verifyLoading ? "验证中…" : "下一步"}
                        </button>
                    </div>
                </div>
            )}

            {step === "confirm" && inviteInfo && (
                <div className="wk-join-space-modal wk-join-space-modal--confirm">
                    <div className="wk-join-space-modal__space-preview">
                        <div className="wk-join-space-modal__space-avatar">
                            {inviteInfo.space_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="wk-join-space-modal__space-name">{inviteInfo.space_name}</div>
                        <div className="wk-join-space-modal__space-meta">
                            {inviteInfo.max_users > 0
                                ? `${inviteInfo.member_count} / ${inviteInfo.max_users} 位成员`
                                : `${inviteInfo.member_count} 位成员`}
                        </div>
                        {isFull && (
                            <div className="wk-join-space-modal__full-badge">空间已满</div>
                        )}
                    </div>
                    <div className="wk-join-space-modal__footer">
                        <button className="wk-join-space-modal__btn wk-join-space-modal__btn--cancel" onClick={onBack}>
                            ← 重新输入
                        </button>
                        <button
                            className="wk-join-space-modal__btn wk-join-space-modal__btn--confirm"
                            onClick={onJoin}
                            disabled={joinLoading || isFull}
                        >
                            {joinLoading ? "加入中…" : isFull ? "空间已满" : "确认加入"}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
