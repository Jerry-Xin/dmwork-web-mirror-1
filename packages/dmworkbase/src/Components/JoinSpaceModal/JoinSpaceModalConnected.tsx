import React from "react";
import JoinSpaceModal from "./index";
import { useJoinSpace } from "./useJoinSpace";

export interface JoinSpaceModalConnectedProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: (spaceId: string) => void;
}

/**
 * 预组合版本：JoinSpaceModal + useJoinSpace hook
 * 供 Class 组件直接使用，无需自行桥接 hook
 */
export default function JoinSpaceModalConnected({
    visible,
    onClose,
    onSuccess,
}: JoinSpaceModalConnectedProps) {
    const joinProps = useJoinSpace({ onClose, onSuccess });
    return <JoinSpaceModal visible={visible} {...joinProps} />;
}
