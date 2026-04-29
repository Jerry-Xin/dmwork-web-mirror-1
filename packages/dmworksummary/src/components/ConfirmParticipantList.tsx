import React from "react";
import { List, Tag } from "@douyinfe/semi-ui";
import { IconTickCircle, IconClock, IconClose } from "@douyinfe/semi-icons";
import type { Participant } from "../types/summary";
import { ParticipantStatus } from "../types/summary";
import { formatDate } from "../utils/summaryHelpers";

interface ConfirmParticipantListProps {
    participants: Participant[];
}

function statusIcon(status: number) {
    switch (status) {
        case ParticipantStatus.CONFIRMED:
            return <IconTickCircle style={{ color: "var(--semi-color-success)" }} />;
        case ParticipantStatus.DECLINED:
            return <IconClose style={{ color: "var(--semi-color-danger)" }} />;
        default:
            return <IconClock style={{ color: "var(--semi-color-warning)" }} />;
    }
}

function statusLabel(status: number): string {
    switch (status) {
        case ParticipantStatus.CONFIRMED: return "已确认";
        case ParticipantStatus.DECLINED: return "已拒绝";
        default: return "等待确认";
    }
}

function statusColor(status: number): string {
    switch (status) {
        case ParticipantStatus.CONFIRMED: return "green";
        case ParticipantStatus.DECLINED: return "red";
        default: return "amber";
    }
}

const ConfirmParticipantList: React.FC<ConfirmParticipantListProps> = ({
    participants,
}) => {
    return (
        <List
            dataSource={participants}
            renderItem={(p: Participant) => (
                <List.Item
                    key={p.user_id}
                    header={statusIcon(p.status ?? 0)}
                    main={
                        <div>
                            <span style={{ fontWeight: 500 }}>{p.user_name || `用户 ${p.user_id}`}</span>
                            {p.confirmed_at && (
                                <span style={{ color: "var(--semi-color-text-2)", marginLeft: 8, fontSize: 12 }}>
                                    {formatDate(p.confirmed_at)}
                                </span>
                            )}
                        </div>
                    }
                    extra={
                        <Tag color={statusColor(p.status ?? 0) as any} size="small">
                            {statusLabel(p.status ?? 0)}
                        </Tag>
                    }
                />
            )}
        />
    );
};

export default ConfirmParticipantList;
