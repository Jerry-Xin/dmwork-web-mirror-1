import React, { Component } from "react";
import { Space } from "wukongimjssdk";
import SpaceItem from "../SpaceItem";
import SpaceAvatar from "../SpaceAvatar";
import ActionListItem from "../ActionListItem";
import WKButton from "../WKButton";
import { IconSearch, IconPlus, IconLink } from "@douyinfe/semi-icons";

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
                    className="wk-navrail__space-btn"
                    title={current?.name ?? "切换 Space"}
                    onClick={this.handleToggle}
                >
                    {current ? (
                        <SpaceAvatar name={current.name} logo={current.logo} size="md" className="wk-navrail__space-avatar" />
                    ) : (
                        <span className="wk-navrail__space-icon wk-navrail__space-icon--empty">?</span>
                    )}
                </button>

                {open && (
                    <>
                        {/* 点击外部关闭 */}
                        <div
                            className="wk-navrail__dropdown-mask"
                            onClick={this.handleClose}
                        />
                        <div className="wk-navrail__dropdown" onClick={e => e.stopPropagation()}>
                            {spaces.map(space => (
                                <SpaceItem
                                    key={space.space_id}
                                    name={space.name}
                                    logo={space.logo}
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
                                            icon={<IconLink />}
                                            title="复制邀请链接"
                                            onClick={(e) => onCopyInviteLink(space.space_id, e)}
                                        />
                                    )}
                                />
                            ))}
                            <div className="wk-navrail__dropdown-divider" />
                            {onJoinSpace && (
                                <ActionListItem
                                    icon={<IconSearch />}
                                    label="加入 Space"
                                    desc="通过邀请码或链接加入"
                                    variant="join"
                                    onClick={() => { this.handleClose(); onJoinSpace(); }}
                                />
                            )}
                            {onCreateSpace && (
                                <ActionListItem
                                    icon={<IconPlus />}
                                    label="创建 Space"
                                    desc="新建你自己的工作空间"
                                    variant="create"
                                    onClick={() => { this.handleClose(); onCreateSpace(); }}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }
}
