import React from "react";
import { Timeline, Button, Tag } from "@douyinfe/semi-ui";
import type { SummaryResult } from "../types/summary";
import { formatDate } from "../utils/summaryHelpers";

interface SummaryVersionHistoryProps {
    versions: SummaryResult[];
    currentVersion: number;
    onSelectVersion: (version: number) => void;
}

const SummaryVersionHistory: React.FC<SummaryVersionHistoryProps> = ({
    versions,
    currentVersion,
    onSelectVersion,
}) => {
    if (!versions || versions.length === 0) {
        return <div className="summary-version-empty">暂无历史版本</div>;
    }

    const sorted = [...versions].sort((a, b) => b.version - a.version);

    return (
        <div className="summary-version-history">
            <Timeline>
                {sorted.map((v) => {
                    const isCurrent = v.version === currentVersion;
                    return (
                        <Timeline.Item key={v.version} color={isCurrent ? "blue" : "grey"}>
                            <div className="summary-version-item">
                                <div className="summary-version-header">
                                    <span>版本 {v.version}</span>
                                    {isCurrent && (
                                        <Tag color="blue" size="small" style={{ marginLeft: 8 }}>
                                            当前
                                        </Tag>
                                    )}
                                </div>
                                <div className="summary-version-meta">
                                    {formatDate(v.generated_at)} · {v.total_msg_count} 条消息 · {v.model_version}
                                </div>
                                {!isCurrent && (
                                    <Button
                                        size="small"
                                        theme="borderless"
                                        onClick={() => onSelectVersion(v.version)}
                                        style={{ marginTop: 4 }}
                                    >
                                        查看此版本
                                    </Button>
                                )}
                            </div>
                        </Timeline.Item>
                    );
                })}
            </Timeline>
        </div>
    );
};

export default SummaryVersionHistory;
