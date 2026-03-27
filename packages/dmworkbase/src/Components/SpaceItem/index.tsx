import React, { ReactNode } from "react";
import SpaceAvatar, { SpaceAvatarSize } from "../SpaceAvatar";
import "./index.css";

export interface SpaceItemProps {
    name: string;
    logo?: string;
    meta?: string;               // 副标签，如「12 成员」
    selected?: boolean;
    avatarSize?: SpaceAvatarSize;
    /** hover 时右侧出现的操作 slot */
    actions?: ReactNode;
    onClick?: () => void;
    className?: string;
}

export default function SpaceItem({
    name,
    logo,
    meta,
    selected = false,
    avatarSize = "md",
    actions,
    onClick,
    className,
}: SpaceItemProps) {
    const cls = [
        "wk-space-item",
        selected && "wk-space-item--selected",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={cls} onClick={onClick} role="button" tabIndex={0}>
            <SpaceAvatar name={name} logo={logo} size={avatarSize} />
            <div className="wk-space-item__info">
                <span className="wk-space-item__name">{name}</span>
                {meta && <span className="wk-space-item__meta">{meta}</span>}
            </div>
            {actions && (
                <div className="wk-space-item__actions">{actions}</div>
            )}
        </div>
    );
}
