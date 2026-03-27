import { useState } from "react";
import { Toast } from "@douyinfe/semi-ui";
import { SpaceService } from "../../Service/SpaceService";
import { InviteInfo, JoinStep } from "./index";

export interface UseJoinSpaceOptions {
    onSuccess?: (spaceId: string) => void;
    onClose?: () => void;
}

export function useJoinSpace({ onSuccess, onClose }: UseJoinSpaceOptions = {}) {
    const [step, setStep] = useState<JoinStep>("input");
    const [code, setCode] = useState("");
    const [inviteInfo, setInviteInfo] = useState<InviteInfo | undefined>();
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);

    const reset = () => {
        setStep("input");
        setCode("");
        setInviteInfo(undefined);
    };

    const handleCancel = () => {
        reset();
        onClose?.();
    };

    const handleVerify = async () => {
        const trimmed = code.trim();
        if (!trimmed) { Toast.warning("请输入邀请码或邀请链接"); return; }

        // 支持完整链接，提取末段
        const extracted = trimmed.includes("/")
            ? trimmed.split("/").filter(Boolean).pop() ?? trimmed
            : trimmed;

        if (!/^[a-zA-Z0-9_-]+$/.test(extracted)) {
            Toast.error("邀请码格式不正确");
            return;
        }

        setVerifyLoading(true);
        try {
            const info = await SpaceService.shared.getInviteInfo(extracted);
            setInviteInfo({ ...info, invite_code: extracted });
            setStep("confirm");
        } catch (e: any) {
            const msg = e?.msg || e?.message || "";
            if (msg.includes("已满") || msg.includes("SPACE_FULL")) {
                Toast.error("该空间已满，无法加入");
            } else {
                Toast.error("邀请码无效或已过期");
            }
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!inviteInfo) return;
        setJoinLoading(true);
        try {
            const result: any = await SpaceService.shared.joinSpace(inviteInfo.invite_code);
            const spaceId = result?.space_id || inviteInfo.space_id;
            Toast.success(`已加入 ${inviteInfo.space_name}`);
            reset();
            onClose?.();
            onSuccess?.(spaceId);
        } catch (e: any) {
            const msg = e?.msg || e?.message || "";
            if (msg.includes("已是成员") || msg.includes("already")) {
                reset();
                onClose?.();
                onSuccess?.(inviteInfo.space_id);
            } else if (msg.includes("已满") || msg.includes("SPACE_FULL")) {
                Toast.error("空间已满，无法加入");
            } else {
                Toast.error(msg || "加入失败，请重试");
            }
        } finally {
            setJoinLoading(false);
        }
    };

    return {
        step,
        code,
        onCodeChange: setCode,
        inviteInfo,
        verifyLoading,
        joinLoading,
        onVerify: handleVerify,
        onJoin: handleJoin,
        onBack: () => setStep("input"),
        onCancel: handleCancel,
    };
}
