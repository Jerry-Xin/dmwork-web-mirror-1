import React, { useState, useCallback } from "react";
import { Tag, Button, Input } from "@douyinfe/semi-ui";
import { IconPlus } from "@douyinfe/semi-icons";

interface ParticipantItem {
    user_id: number;
    user_name?: string;
}

interface ParticipantSelectorProps {
    value: ParticipantItem[];
    onChange: (participants: ParticipantItem[]) => void;
    maxParticipants?: number;
}

const ParticipantSelector: React.FC<ParticipantSelectorProps> = ({
    value,
    onChange,
    maxParticipants = 20,
}) => {
    const [adding, setAdding] = useState(false);
    const [userId, setUserId] = useState("");
    const [userName, setUserName] = useState("");

    const handleAdd = useCallback(() => {
        const uid = parseInt(userId, 10);
        if (isNaN(uid) || uid <= 0) return;
        if (value.length >= maxParticipants) return;
        if (value.some((p) => p.user_id === uid)) return;
        onChange([...value, { user_id: uid, user_name: userName.trim() || `用户 ${uid}` }]);
        setUserId("");
        setUserName("");
        setAdding(false);
    }, [value, onChange, userId, userName, maxParticipants]);

    const handleRemove = useCallback(
        (index: number) => {
            const next = [...value];
            next.splice(index, 1);
            onChange(next);
        },
        [value, onChange],
    );

    return (
        <div className="summary-participant-selector">
            <div className="summary-participant-list">
                {value.map((p, index) => (
                    <Tag
                        key={p.user_id}
                        closable
                        onClose={() => handleRemove(index)}
                        size="large"
                        style={{ marginBottom: 4, marginRight: 4 }}
                    >
                        {p.user_name || `用户 ${p.user_id}`}
                    </Tag>
                ))}
            </div>

            {adding ? (
                <div className="summary-participant-add-form">
                    <Input
                        value={userId}
                        onChange={setUserId}
                        placeholder="用户 ID"
                        size="small"
                        style={{ width: 120 }}
                        type="number"
                    />
                    <Input
                        value={userName}
                        onChange={setUserName}
                        placeholder="用户名（可选）"
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
                value.length < maxParticipants && (
                    <Button
                        icon={<IconPlus />}
                        size="small"
                        theme="borderless"
                        onClick={() => setAdding(true)}
                        style={{ marginTop: 4 }}
                    >
                        添加参与者
                    </Button>
                )
            )}
        </div>
    );
};

export default ParticipantSelector;
