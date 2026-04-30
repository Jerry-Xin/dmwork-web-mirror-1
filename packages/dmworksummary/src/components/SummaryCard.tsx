import React from "react";
import { Button, Popconfirm } from "@douyinfe/semi-ui";
import { IconDelete } from "@douyinfe/semi-icons";
import WKApp from "@dmwork/base/src/App";
import type { SummaryListItem } from "../types/summary";
import { ParticipantStatus } from "../types/summary";
import { getModeLabel, formatDate } from "../utils/summaryHelpers";
import TaskStatusBadge from "./TaskStatusBadge";

interface SummaryCardProps {
    task: SummaryListItem;
    onClick: (taskId: number) => void;
    onDelete: (taskId: number) => void;
    onRespond?: (taskId: number, action: "accept" | "reject") => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ task, onClick, onDelete, onRespond }) => {
    const sourcesSummary = task.sources
        .slice(0, 3)
        .map((s) => s.source_name || s.source_id)
        .join("、");
    const extraCount = task.sources.length > 3 ? `等 ${task.sources.length} 个来源` : "";

    const currentUid = WKApp.loginInfo.uid;
    const myParticipant = task.participants?.find((p) => p.user_id === currentUid);
    const isPendingInvite = myParticipant != null && myParticipant.status === ParticipantStatus.PENDING;

    return (
        <div className="summary-card" onClick={() => onClick(task.task_id)}>
            <div className="summary-card-header">
                <div className="summary-card-title">
                    {task.title || task.task_no}
                </div>
                <TaskStatusBadge status={task.status} />
            </div>

            {task.sources.length > 0 && (
                <div className="summary-card-sources">
                    来源：{sourcesSummary}{extraCount}
                </div>
            )}
            {isPendingInvite && onRespond && (
                <div
                    className="summary-card-respond"
                    style={{ display: "flex", gap: 8, padding: "8px 0 0" }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button
                        size="small"
                        theme="solid"
                        onClick={() => onRespond(task.task_id, "accept")}
                    >
                        同意
                    </Button>
                    <Button
                        size="small"
                        onClick={() => onRespond(task.task_id, "reject")}
                    >
                        拒绝
                    </Button>
                </div>
            )}
            <div className="summary-card-footer">
                <span className="summary-card-created">{task.creator_name || '未知'} 发起</span>
                <span className="summary-card-date">{task.created_at?.substring(0, 10) || ''}</span>
                <Popconfirm
                    title="确认删除"
                    content={`确定要删除「${task.title || task.task_no}」吗？删除后历史版本也将一并清除。`}
                    onConfirm={(e) => {
                        e?.stopPropagation();
                        onDelete(task.task_id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                >
                    <Button
                        theme="borderless"
                        type="danger"
                        size="small"
                        icon={<IconDelete />}
                        onClick={(e) => e.stopPropagation()}
                    />
                </Popconfirm>
            </div>
        </div>
    );
};

export default SummaryCard;
