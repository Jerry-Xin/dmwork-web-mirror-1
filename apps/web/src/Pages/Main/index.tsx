import { WKApp, WKLayout, Provider } from "@dmwork/base";
import React, { Component } from "react";
import "./index.css"
import MainVM from "./vm";
import { EmptyStateIllustration } from "./EmptyStateIllustration";
import { Space, SpaceService } from "@dmwork/base";
import { SpaceCreate, JoinSpaceModalConnected, NavRail } from "@dmwork/base";
import { Toast } from "@douyinfe/semi-ui";

export interface MainContentLeftProps {
    vm: MainVM
}

interface MainContentLeftFullState {
    allSpaces: Space[];
    showSpaceCreate: boolean;
    showJoinSpace: boolean;
}

export class MainContentLeft extends Component<MainContentLeftProps, MainContentLeftFullState> {
    constructor(props: any) {
        super(props)
        this.state = {
            allSpaces: [],
            showSpaceCreate: false,
            showJoinSpace: false,
        }
    }

    handleSpaceSelected = (spaceId: string) => {
        SpaceService.shared.getMySpaces().then(spaces => {
            this.setState({ allSpaces: spaces, showSpaceCreate: false, showJoinSpace: false });
            WKApp.shared.currentSpaceId = spaceId;
            localStorage.setItem("currentSpaceId", spaceId);
            const target = spaces.find(s => s.space_id === spaceId);
            if (target) WKApp.mittBus.emit("space-changed", target);
            WKApp.shared.notifyListener();
        }).catch(() => {
            Toast.error("刷新 Space 列表失败，请手动刷新");
        });
    };

    handleCopyInviteLink = async (spaceId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const detail = await WKApp.apiClient.get(`/space/${spaceId}`);
            if (!detail.invite_code) { Toast.warning("该 Space 暂无邀请码"); return; }
            const link = `${window.location.origin}${window.location.pathname}?invite=${detail.invite_code}`;
            let copied = false;
            try {
                await navigator.clipboard.writeText(link);
                copied = true;
            } catch {
                const textarea = document.createElement("textarea");
                textarea.value = link;
                textarea.style.cssText = "position:fixed;opacity:0";
                document.body.appendChild(textarea);
                textarea.select();
                copied = document.execCommand("copy");
                document.body.removeChild(textarea);
            }
            copied ? Toast.success("邀请链接已复制") : Toast.error("复制失败，请手动复制");
        } catch {
            Toast.error("获取邀请码失败");
        }
    };

    handleAvatarClick = () => {
        const { vm } = this.props;
        const uid = WKApp.loginInfo.uid;
        WKApp.apiClient
            .get(`/users/${uid}`)
            .then((data) => {
                const loginInfo = WKApp.loginInfo;
                loginInfo.shortNo = data.short_no;
                loginInfo.name = data.name;
                loginInfo.sex = data.sex;
                loginInfo.save();
                vm.showMeInfo = true;
            })
            .catch(() => {});
    };

    componentDidMount() {
        const { vm } = this.props;
        // 注册菜单刷新回调
        WKApp.menus.setRefresh = () => { this.forceUpdate(); };

        SpaceService.shared.getMySpaces().then(spaces => {
            this.setState({ allSpaces: spaces });
            const savedSpaceId = localStorage.getItem("currentSpaceId");
            if (savedSpaceId && spaces.find(s => s.space_id === savedSpaceId)) {
                WKApp.shared.currentSpaceId = savedSpaceId;
            } else if (spaces.length > 0) {
                WKApp.shared.currentSpaceId = spaces[0].space_id;
                localStorage.setItem("currentSpaceId", spaces[0].space_id);
                this.forceUpdate();
            } else {
                WKApp.shared.currentSpaceId = '';
                WKApp.shared.spaceChecked = false;
                localStorage.removeItem("currentSpaceId");
                try { WKApp.shared.notifyListener(); } catch (_) {}
            }
        }).catch(() => {});
    }

    render() {
        const { vm } = this.props;
        const { allSpaces } = this.state;
        const currentSpaceId = WKApp.shared.currentSpaceId;

        return (
            <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                {/* NavRail — 全面接管原 TabNormalScreen + wk-global-topbar */}
                <NavRail
                    // Space
                    spaces={allSpaces}
                    currentSpaceId={currentSpaceId}
                    onSpaceSelect={this.handleSpaceSelected}
                    onCopyInviteLink={this.handleCopyInviteLink}
                    onJoinSpace={() => this.setState({ showJoinSpace: true })}
                    onCreateSpace={() => this.setState({ showSpaceCreate: true })}
                    // 菜单
                    menusList={vm.menusList}
                    currentMenus={vm.currentMenus}
                    onMenuClick={(menus) => {
                        vm.currentMenus = menus;
                        if (menus.onPress) {
                            menus.onPress();
                        } else {
                            WKApp.routeLeft.popToRoot();
                        }
                    }}
                    // 用户
                    onAvatarClick={this.handleAvatarClick}
                    showMeInfo={vm.showMeInfo}
                    onSetShowMeInfo={(v) => { vm.showMeInfo = v; }}
                    // 设置
                    settingSelected={vm.settingSelected}
                    hasNewVersion={vm.hasNewVersion}
                    showNewVersion={vm.showNewVersion}
                    showAppVersion={vm.showAppVersion}
                    showAppUpdate={vm.showAppUpdate}
                    appUpdateProgress={vm.appUpdateProgress}
                    showAppUpdateOperation={vm.showAppUpdateOperation}
                    lastVersionInfo={vm.lastVersionInfo}
                    onToggleSetting={() => { vm.settingSelected = !vm.settingSelected; }}
                    onSetShowNewVersion={(v) => { vm.showNewVersion = v; }}
                    onSetShowAppVersion={(v) => { vm.showAppVersion = v; vm.notifyListener(); }}
                    onInstallUpdate={() => vm.installUpdate()}
                    onNotifyListener={() => vm.notifyListener()}
                />

                {/* 路由内容（Sidebar + Main） */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--wk-border-default)' }}>
                    {vm.historyRoutePaths.map((routePath, i) => {
                        const Cpt = WKApp.route.get(routePath);
                        return (
                            <div key={i} style={{ display: routePath === vm.currentMenus?.routePath ? "block" : "none", width: "100%", height: "100%" }}>
                                {React.isValidElement(Cpt) ? Cpt : undefined}
                            </div>
                        );
                    })}
                </div>

                <SpaceCreate
                    visible={this.state.showSpaceCreate}
                    onClose={() => this.setState({ showSpaceCreate: false })}
                    onSuccess={this.handleSpaceSelected}
                />
                <JoinSpaceModalConnected
                    visible={this.state.showJoinSpace}
                    onClose={() => this.setState({ showJoinSpace: false })}
                    onSuccess={this.handleSpaceSelected}
                />
            </div>
        );
    }
}

export class MainPage extends Component {
    render() {
        return (
            <Provider create={() => new MainVM()} render={(vm: MainVM) => {
                return (
                    <WKLayout
                        contentLeft={<MainContentLeft vm={vm} />}
                        onRightContext={(context) => {
                            WKApp.routeRight.setPush = (view) => { context.push(view); };
                            WKApp.routeRight.setReplaceToRoot = (view) => { context.replaceToRoot(view); };
                            WKApp.routeRight.setPop = () => { context.pop(); };
                            WKApp.routeRight.setPopToRoot = () => { context.popToRoot(); };
                        }}
                        onLeftContext={(context) => {
                            WKApp.routeLeft.setPush = (view) => { context.push(view); };
                            WKApp.routeLeft.setReplaceToRoot = (view) => { context.replaceToRoot(view); };
                            WKApp.routeLeft.setPop = () => { context.pop(); };
                            WKApp.routeLeft.setPopToRoot = () => { context.popToRoot(); };
                        }}
                        contentRight={<EmptyStateIllustration />}
                    />
                );
            }}>
            </Provider>
        );
    }
}
