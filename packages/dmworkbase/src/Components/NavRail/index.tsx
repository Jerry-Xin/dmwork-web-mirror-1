import React, { Component } from "react";
import { Space } from "wukongimjssdk";
import NavSpaceSwitcher from "./NavSpaceSwitcher";
import NavItem from "./NavItem";
import NavBottom from "./NavBottom";
import "./index.css";

// 消息 icon
function IconMessage() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

export type NavRailItem = "messages";

export interface NavRailProps {
    /** 当前激活的导航项 */
    activeItem?: NavRailItem;
    onItemClick?: (key: NavRailItem) => void;
    /** 未读消息数，用于 badge */
    unreadCount?: number;
    // Space 相关
    spaces: Space[];
    currentSpaceId?: string;
    onSpaceSelect: (spaceId: string) => void;
    onCopyInviteLink?: (spaceId: string, e: React.MouseEvent) => void;
    onJoinSpace?: () => void;
    onCreateSpace?: () => void;
    // 用户
    userName?: string;
    onSettingsClick?: () => void;
    onAvatarClick?: () => void;
}

export default class NavRail extends Component<NavRailProps> {
    render() {
        const {
            activeItem = "messages",
            onItemClick,
            unreadCount,
            spaces,
            currentSpaceId,
            onSpaceSelect,
            onCopyInviteLink,
            onJoinSpace,
            onCreateSpace,
            userName,
            onSettingsClick,
            onAvatarClick,
        } = this.props;

        return (
            <nav className="wk-navrail" aria-label="主导航">
                {/* 顶部：Space 切换器 */}
                <NavSpaceSwitcher
                    spaces={spaces}
                    currentSpaceId={currentSpaceId}
                    onSpaceSelect={onSpaceSelect}
                    onCopyInviteLink={onCopyInviteLink}
                    onJoinSpace={onJoinSpace}
                    onCreateSpace={onCreateSpace}
                />

                {/* 中部：导航按钮列表 */}
                <div className="wk-navrail__items">
                    <NavItem
                        icon={<IconMessage />}
                        label="消息"
                        active={activeItem === "messages"}
                        badge={unreadCount}
                        onClick={() => onItemClick?.("messages")}
                    />
                </div>

                {/* 底部：设置 + 用户头像 */}
                <NavBottom
                    userName={userName}
                    onSettingsClick={onSettingsClick}
                    onAvatarClick={onAvatarClick}
                />
            </nav>
        );
    }
}

export { NavSpaceSwitcher, NavItem, NavBottom };
export type { NavItemProps } from "./NavItem";
export type { NavSpaceSwitcherProps } from "./NavSpaceSwitcher";
export type { NavBottomProps } from "./NavBottom";
