import React, { useState, useCallback } from "react";
import { Select, Tag, Button, Input } from "@douyinfe/semi-ui";
import { IconPlus } from "@douyinfe/semi-icons";
import type { SourceItem, SourceTypeValue } from "../types/summary";
import { SourceType } from "../types/summary";
import { getSourceTypeLabel } from "../utils/summaryHelpers";

interface SourceSelectorProps {
    value: SourceItem[];
    onChange: (sources: SourceItem[]) => void;
    sourceTypes?: SourceTypeValue[];
    maxSources?: number;
}

const sourceTypeOptions = [
    { value: SourceType.GROUP_CHAT, label: "群聊" },
    { value: SourceType.THREAD, label: "子区" },
    { value: SourceType.DIRECT_MESSAGE, label: "私聊" },
];

const SourceSelector: React.FC<SourceSelectorProps> = ({
    value,
    onChange,
    sourceTypes,
    maxSources = 10,
}) => {
    const [adding, setAdding] = useState(false);
    const [newSourceType, setNewSourceType] = useState<SourceTypeValue>(SourceType.GROUP_CHAT);
    const [newSourceId, setNewSourceId] = useState("");
    const [newSourceName, setNewSourceName] = useState("");

    const filteredOptions = sourceTypes
        ? sourceTypeOptions.filter((o) => sourceTypes.includes(o.value))
        : sourceTypeOptions;

    const handleAdd = useCallback(() => {
        if (!newSourceId.trim()) return;
        if (value.length >= maxSources) return;
        const exists = value.some(
            (s) => s.source_type === newSourceType && s.source_id === newSourceId,
        );
        if (exists) return;
        onChange([
            ...value,
            {
                source_type: newSourceType,
                source_id: newSourceId.trim(),
                source_name: newSourceName.trim() || newSourceId.trim(),
            },
        ]);
        setNewSourceId("");
        setNewSourceName("");
        setAdding(false);
    }, [value, onChange, newSourceType, newSourceId, newSourceName, maxSources]);

    const handleRemove = useCallback(
        (index: number) => {
            const next = [...value];
            next.splice(index, 1);
            onChange(next);
        },
        [value, onChange],
    );

    return (
        <div className="summary-source-selector">
            <div className="summary-source-list">
                {value.map((source, index) => (
                    <Tag
                        key={`${source.source_type}-${source.source_id}`}
                        closable
                        onClose={() => handleRemove(index)}
                        color="blue"
                        size="large"
                        style={{ marginBottom: 4, marginRight: 4 }}
                    >
                        [{getSourceTypeLabel(source.source_type)}] {source.source_name || source.source_id}
                    </Tag>
                ))}
            </div>

            {adding ? (
                <div className="summary-source-add-form">
                    <Select
                        value={newSourceType}
                        onChange={(val) => setNewSourceType(val as SourceTypeValue)}
                        style={{ width: 100 }}
                        size="small"
                    >
                        {filteredOptions.map((opt) => (
                            <Select.Option key={opt.value} value={opt.value}>
                                {opt.label}
                            </Select.Option>
                        ))}
                    </Select>
                    <Input
                        value={newSourceId}
                        onChange={setNewSourceId}
                        placeholder="来源 ID"
                        size="small"
                        style={{ width: 160, marginLeft: 8 }}
                    />
                    <Input
                        value={newSourceName}
                        onChange={setNewSourceName}
                        placeholder="名称（可选）"
                        size="small"
                        style={{ width: 120, marginLeft: 8 }}
                    />
                    <Button size="small" theme="solid" onClick={handleAdd} style={{ marginLeft: 8 }}>
                        添加
                    </Button>
                    <Button size="small" theme="borderless" onClick={() => setAdding(false)} style={{ marginLeft: 4 }}>
                        取消
                    </Button>
                </div>
            ) : (
                value.length < maxSources && (
                    <Button
                        icon={<IconPlus />}
                        size="small"
                        theme="borderless"
                        onClick={() => setAdding(true)}
                        style={{ marginTop: 4 }}
                    >
                        添加来源
                    </Button>
                )
            )}
        </div>
    );
};

export default SourceSelector;
