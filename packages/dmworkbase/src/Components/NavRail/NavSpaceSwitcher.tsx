import React, { Component } from "react";
import { Space } from "wukongimjssdk";
import SpaceItem from "../SpaceItem";
import ActionListItem from "../ActionListItem";
import WKButton from "../WKButton";
function IconChainLink() {
    return (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    );
}

function IconBuilding() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
            <path d="M9 9h1" />
            <path d="M9 13h1" />
            <path d="M9 17h1" />
        </svg>
    );
}

import { IconJoinSpace, IconCreateSpace } from "./icons";

export interface NavSpaceSwitcherProps {
    spaces: Space[];
    currentSpaceId?: string;
    onSpaceSelect: (spaceId: string) => void;
    onCopyInviteLink?: (spaceId: string, e: React.MouseEvent) => void;
    onJoinSpace?: () => void;
    onCreateSpace?: () => void;
}

interface NavSpaceSwitcherState {
    open: boolean;
}




export default class NavSpaceSwitcher extends Component<NavSpaceSwitcherProps, NavSpaceSwitcherState> {
    constructor(props: NavSpaceSwitcherProps) {
        super(props);
        this.state = { open: false };
    }

    componentDidMount() {
        document.addEventListener("keydown", this.handleKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.handleKeyDown);
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && this.state.open) {
            this.handleClose();
        }
    };

    private handleToggle = () => {
        this.setState(prev => ({ open: !prev.open }));
    };

    private handleClose = () => {
        this.setState({ open: false });
    };

    render() {
        const { spaces, currentSpaceId, onSpaceSelect, onCopyInviteLink, onJoinSpace, onCreateSpace } = this.props;
        const { open } = this.state;
        const current = spaces.find(s => s.space_id === currentSpaceId);

        return (
            <div className="wk-navrail__switcher">
                <button
                    type="button"
                    className="wk-navrail__space-icon-btn"
                    title={current?.name ?? "切换 Space"}
                    aria-label="切换 Space"
                    onClick={this.handleToggle}
                >
                    <IconBuilding />
                </button>

                {open && (
                    <>
                        {/* 点击外部关闭 */}
                        <div
                            className="wk-navrail__dropdown-mask"
                            onClick={this.handleClose}
                        />
                        <div className="wk-navrail__dropdown" onClick={e => e.stopPropagation()}>
                            {/* 弹窗标题 */}
                            <div className="wk-navrail__dropdown-title">切换 Space</div>
                            {/* 可滚动的 Space 列表 */}
                            <div className="wk-navrail__dropdown-spaces">
                                {spaces.map(space => (
                                    <SpaceItem
                                        key={space.space_id}
                                        name={space.name}
                                        logo={space.logo}
                                        avatarSize="xs"
                                        meta={space.max_users > 0
                                            ? `${space.member_count}/${space.max_users} 人`
                                            : `${space.member_count} 人`}
                                        selected={space.space_id === currentSpaceId}
                                        onClick={() => {
                                            onSpaceSelect(space.space_id);
                                            this.handleClose();
                                        }}
                                        actions={onCopyInviteLink && (
                                            <WKButton
                                                variant="ghost"
                                                size="sm"
                                                iconOnly
                                                icon={<IconChainLink />}
                                                title="复制邀请链接"
                                                onClick={(e) => onCopyInviteLink(space.space_id, e)}
                                            />
                                        )}
                                    />
                                ))}
                            </div>
                            {/* 固定底部操作区 */}
                            {(onJoinSpace || onCreateSpace) && (
                                <>
                                    <div className="wk-navrail__dropdown-divider" />
                                    <div className="wk-navrail__dropdown-actions">
                                        {onJoinSpace && (
                                            <ActionListItem
                                                icon={<IconJoinSpace />}
                                                label="加入 Space"
                                                variant="join"
                                                compact
                                                onClick={() => { this.handleClose(); onJoinSpace(); }}
                                            />
                                        )}
                                        {onCreateSpace && (
                                            <ActionListItem
                                                icon={<IconCreateSpace />}
                                                label="创建 Space"
                                                variant="create"
                                                compact
                                                onClick={() => { this.handleClose(); onCreateSpace(); }}
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }
}
