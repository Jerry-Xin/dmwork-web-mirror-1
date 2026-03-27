import React, { ReactNode } from "react";
import "./index.css";

export interface ActionListItemProps {
    /** 左侧 icon 区域内容 */
    icon: ReactNode;
    /** 主标签 */
    label: string;
    /** 副标签（可选） */
    desc?: string;
    /** 视觉风格：join = 绿色，create = 紫色，default = 中性 */
    variant?: "join" | "create" | "default";
    /** 右侧 slot，通常放箭头或 badge */
    trailing?: ReactNode;
    onClick?: () => void;
    className?: string;
}

export default function ActionListItem({
    icon,
    label,
    desc,
    variant = "default",
    trailing,
    onClick,
    className,
}: ActionListItemProps) {
    const cls = [
        "wk-action-list-item",
        `wk-action-list-item--${variant}`,
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button className={cls} onClick={onClick} type="button">
            <div className={`wk-action-list-item__icon wk-action-list-item__icon--${variant}`}>
                {icon}
            </div>
            <div className="wk-action-list-item__text">
                <span className="wk-action-list-item__label">{label}</span>
                {desc && <span className="wk-action-list-item__desc">{desc}</span>}
            </div>
            {trailing && (
                <div className="wk-action-list-item__trailing">{trailing}</div>
            )}
        </button>
    );
}
