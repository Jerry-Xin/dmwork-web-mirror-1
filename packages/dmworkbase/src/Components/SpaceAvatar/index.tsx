import React from "react";
import "./index.css";

// Figma: 纯色 avatar，与设计稿色板对齐
const AVATAR_COLORS = [
    "#34C759", // 绿
    "#6569E8", // 紫
    "#FA8C16", // 橙
    "#1AC4B3", // 青
    "#B3D600", // 黄绿
    "#5B9BF5", // 蓝
];

function getGradient(name: string): string {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export type SpaceAvatarSize = "xs" | "sm" | "md" | "lg" | "switcher";

export interface SpaceAvatarProps {
    name: string;
    logo?: string;
    size?: SpaceAvatarSize;
    className?: string;
}

export default function SpaceAvatar({
    name,
    logo,
    size = "md",
    className,
}: SpaceAvatarProps) {
    const cls = ["wk-space-avatar", `wk-space-avatar--${size}`, className]
        .filter(Boolean)
        .join(" ");

    if (logo) {
        return <img className={cls} src={logo} alt={name} />;
    }

    return (
        <div
            className={cls}
            style={{ background: getGradient(name) }}
            aria-label={name}
        >
            {name.charAt(0).toUpperCase()}
        </div>
    );
}
