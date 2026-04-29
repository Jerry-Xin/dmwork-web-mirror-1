import React from "react";
import { Tag } from "@douyinfe/semi-ui";
import type { TaskStatusType } from "../types/summary";
import { getStatusLabel, getStatusColor } from "../utils/summaryHelpers";

interface TaskStatusBadgeProps {
    status: TaskStatusType;
}

const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status }) => {
    return (
        <Tag color={getStatusColor(status) as any} size="small">
            {getStatusLabel(status)}
        </Tag>
    );
};

export default TaskStatusBadge;
