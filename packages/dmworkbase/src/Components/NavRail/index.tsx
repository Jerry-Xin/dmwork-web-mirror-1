import React, { Component } from "react";
import { Space } from "wukongimjssdk";
import { Menus, MeInfo } from "../../App";
import { WKApp } from "../../App";
import NavSpaceSwitcher from "./NavSpaceSwitcher";
import NavItem from "./NavItem";
import NavBottom from "./NavBottom";
import NavSettingsPanel from "./NavSettingsPanel";
import { Modal, Badge } from "@douyinfe/semi-ui";
import "./index.css";

export type NavRailItem = "messages";

export interface NavRailVMProps {
    menusList: Menus[];
    currentMenus?: Menus;
    settingSelected: boolean;
    hasNewVersion: boolean;
    showNewVersion: boolean;
    showAppVersion: boolean;
    showAppUpdate: boolean;
    appUpdateProgress: number;
    showAppUpdateOperation: boolean;
    lastVersionInfo?: { appVersion: string; updateDesc: string };
    showMeInfo: boolean;
    onMenuClick: (menus: Menus) => void;
    onToggleSetting: () => void;
    onSetShowNewVersion: (v: boolean) => void;
    onSetShowAppVersion: (v: boolean) => void;
    onInstallUpdate: () => void;
    onNotifyListener: () => void;
    onAvatarClick: () => void;
    onSetShowMeInfo: (v: boolean) => void;
    // Space 相关
    spaces: Space[];
    currentSpaceId?: string;
    onSpaceSelect: (spaceId: string) => void;
    onCopyInviteLink?: (spaceId: string, e: React.MouseEvent) => void;
    onJoinSpace?: () => void;
    onCreateSpace?: () => void;
}

export interface NavRailProps extends NavRailVMProps {}

export default class NavRail extends Component<NavRailProps> {
    render() {
        const {
            menusList,
            currentMenus,
            settingSelected,
            hasNewVersion,
            showNewVersion,
            showAppVersion,
            showAppUpdate,
            appUpdateProgress,
            showAppUpdateOperation,
            lastVersionInfo,
            showMeInfo,
            onMenuClick,
            onToggleSetting,
            onSetShowNewVersion,
            onSetShowAppVersion,
            onInstallUpdate,
            onNotifyListener,
            onAvatarClick,
            onSetShowMeInfo,
            spaces,
            currentSpaceId,
            onSpaceSelect,
            onCopyInviteLink,
            onJoinSpace,
            onCreateSpace,
        } = this.props;

        return (
            <>
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

                    {/* 中部：动态导航菜单 */}
                    <div className="wk-navrail__items">
                        {menusList.map((menus) => (
                            <NavItem
                                key={menus.id}
                                icon={menus.id === currentMenus?.id ? menus.selectedIcon : menus.icon}
                                label={menus.title}
                                active={menus.id === currentMenus?.id}
                                badge={menus.badge && menus.badge > 0 ? menus.badge : undefined}
                                onClick={() => onMenuClick(menus)}
                            />
                        ))}
                    </div>

                    {/* 底部：设置 + 用户头像 */}
                    <NavBottom
                        hasNewVersion={hasNewVersion}
                        settingSelected={settingSelected}
                        onSettingsClick={onToggleSetting}
                        onAvatarClick={onAvatarClick}
                    />
                </nav>

                {/* 设置面板 + Modals（挂在 nav 外，避免 overflow 裁剪） */}
                <NavSettingsPanel
                    settingSelected={settingSelected}
                    hasNewVersion={hasNewVersion}
                    showNewVersion={showNewVersion}
                    showAppVersion={showAppVersion}
                    showAppUpdate={showAppUpdate}
                    appUpdateProgress={appUpdateProgress}
                    showAppUpdateOperation={showAppUpdateOperation}
                    lastVersionInfo={lastVersionInfo}
                    onToggleSetting={onToggleSetting}
                    onSetShowNewVersion={onSetShowNewVersion}
                    onSetShowAppVersion={onSetShowAppVersion}
                    onInstallUpdate={onInstallUpdate}
                    onNotifyListener={onNotifyListener}
                />

                {/* MeInfo Modal */}
                <Modal
                    width={400}
                    className="wk-main-sider-modal wk-main-sider-meinfo"
                    footer={null}
                    closeIcon={<div />}
                    visible={showMeInfo}
                    mask={false}
                    onCancel={() => onSetShowMeInfo(false)}
                >
                    <MeInfo onClose={() => onSetShowMeInfo(false)} />
                </Modal>
            </>
        );
    }
}

export { NavSpaceSwitcher, NavItem, NavBottom };
export type { NavItemProps } from "./NavItem";
export type { NavSpaceSwitcherProps } from "./NavSpaceSwitcher";
export type { NavBottomProps } from "./NavBottom";
