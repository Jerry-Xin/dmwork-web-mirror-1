import { WKApp, WKLayout, Provider } from "@dmwork/base";
import React, { Component } from "react";
import "./index.css"
import MainVM from "./vm";
import { TabNormalScreen } from "./tab_normal_screen";
import { Space, SpaceService } from "@dmwork/base";
import { SpaceCreate, ConnectionStatus } from "@dmwork/base";
import { Toast } from "@douyinfe/semi-ui";
import { IconSearch } from "@douyinfe/semi-icons";
import classNames from "classnames";


export interface MainContentLeftProps {
    vm: MainVM
}

export interface MainContentLeftState {
}
interface MainContentLeftFullState {
    allSpaces: Space[];
    showSpaceDropdown: boolean;
showSpaceCreate: boolean;
}

export class MainContentLeft extends Component<MainContentLeftProps, MainContentLeftFullState>{
    constructor(props: any) {
        super(props)
        this.state = {
            allSpaces: [],
            showSpaceDropdown: false,
            showSpaceCreate: false,
        }
    }

    componentDidMount() {
        SpaceService.shared.getMySpaces().then(spaces => {
            this.setState({ allSpaces: spaces });
            // 恢复上次选中的 Space，或默认第一个
            const savedSpaceId = localStorage.getItem("currentSpaceId")
            if (savedSpaceId && spaces.find(s => s.space_id === savedSpaceId)) {
                WKApp.shared.currentSpaceId = savedSpaceId
            } else if (spaces.length > 0) {
                // savedSpaceId 不在列表中或 currentSpaceId 为空，fallback 到第一个
                WKApp.shared.currentSpaceId = spaces[0].space_id
                localStorage.setItem("currentSpaceId", spaces[0].space_id)
                this.forceUpdate()
            } else {
                // 无 Space：清除状态，回到 SpaceGate 引导页
                WKApp.shared.currentSpaceId = ''
                WKApp.shared.spaceChecked = false
                localStorage.removeItem("currentSpaceId")
                try { WKApp.shared.notifyListener(); } catch (_) {}
            }
        }).catch(() => {});
    }

    render() {
        const { vm } = this.props
        const { allSpaces, showSpaceDropdown } = this.state;
        const currentSpaceId = WKApp.shared.currentSpaceId;
        const currentSpace = allSpaces.find(s => s.space_id === currentSpaceId);
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

        return <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', borderRight: '1px solid var(--wk-border-default)' }}>
            {/* 全局顶栏 */}
            <div className="wk-global-topbar">
                <div className="wk-global-topbar-space" style={{ position: 'relative' }}
                    onClick={() => this.setState(prev => ({ showSpaceDropdown: !prev.showSpaceDropdown }))}>
                    {currentSpace && (
                        <>
                            <span className="wk-global-topbar-space-icon" style={{
                                backgroundColor: colors[currentSpace.name.charCodeAt(0) % colors.length]
                            }}>{currentSpace.name.charAt(0)}</span>
                            <span className="wk-global-topbar-space-name">{currentSpace.name}</span>
                            <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>▾</span>
                        </>
                    )}
                    {showSpaceDropdown && (
                        <div className="wk-global-topbar-dropdown" onClick={e => e.stopPropagation()}>
                            {allSpaces.map(space => {
                                const isSelected = space.space_id === currentSpaceId;
                                return (
                                    <div key={space.space_id}
                                        className={classNames("wk-global-topbar-dropdown-item", isSelected && "selected")}
                                        onClick={() => {
                                            WKApp.shared.currentSpaceId = space.space_id;
                                            localStorage.setItem("currentSpaceId", space.space_id);
                                            WKApp.shared.notifyListener();
                                            WKApp.mittBus.emit("space-changed", space);
                                            this.setState({ showSpaceDropdown: false });
                                        }}>
                                        <span className="wk-global-topbar-space-icon" style={{
                                            backgroundColor: colors[space.name.charCodeAt(0) % colors.length],
                                            width: 24, height: 24, fontSize: 12,
                                        }}>{space.name.charAt(0)}</span>
                                        <span style={{ flex: 1 }}>{space.name}</span>
                                        <span className="wk-global-topbar-invite-btn" title="复制邀请链接" onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const detail = await WKApp.apiClient.get(`/space/${space.space_id}`);
                                                if (detail.invite_code) {
                                                    const link = `${window.location.origin}${window.location.pathname}?invite=${detail.invite_code}`;
                                                    let copied = false;
                                                    try {
                                                        await navigator.clipboard.writeText(link);
                                                        copied = true;
                                                    } catch {
                                                        // iOS Safari: clipboard API fails outside synchronous click handler
                                                        const textarea = document.createElement("textarea");
                                                        textarea.value = link;
                                                        textarea.style.position = "fixed";
                                                        textarea.style.opacity = "0";
                                                        document.body.appendChild(textarea);
                                                        textarea.select();
                                                        copied = document.execCommand("copy");
                                                        document.body.removeChild(textarea);
                                                    }
                                                    if (copied) {
                                                        Toast.success("邀请链接已复制");
                                                    } else {
                                                        Toast.error("复制失败，请手动复制");
                                                    }
                                                } else { Toast.warning("该 Space 暂无邀请码"); }
                                            } catch { Toast.error("获取邀请码失败"); }
                                        }}>🔗</span>
                                        {isSelected && <span style={{ color: '#6366F1', marginLeft: 4 }}>✓</span>}
                                    </div>
                                );
                            })}
                            <div className="wk-global-topbar-dropdown-divider"></div>
                            <div className="wk-global-topbar-dropdown-item" onClick={() => this.setState({ showSpaceDropdown: false, showSpaceCreate: true })}>
                                <span className="wk-global-topbar-space-icon" style={{ backgroundColor: '#e0e0e0', color: '#666', width: 24, height: 24, fontSize: 14 }}>+</span>
                                <span style={{ flex: 1, color: '#5b6abf' }}>加入 / 创建 Space</span>
                            </div>
                        </div>
                    )}
                </div>
                <ConnectionStatus />
            </div>
            {/* 路由内容 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {vm.historyRoutePaths.map((routePath, i) => {
                    const Cpt = WKApp.route.get(routePath)
                    return <div key={i} style={{ "display": routePath === vm.currentMenus?.routePath ? "block" : "none", "width": "100%", "height": "100%" }}>
                        {React.isValidElement(Cpt) ? Cpt : undefined}
                    </div>
                })}
            </div>
            <SpaceCreate
                visible={this.state.showSpaceCreate}
                onClose={() => {
                    this.setState({ showSpaceCreate: false });
                }}
                onSuccess={() => {
                    this.setState({ showSpaceCreate: false });
                    // 刷新 Space 列表
                    SpaceService.shared.getMySpaces().then(spaces => {
                        this.setState({ allSpaces: spaces });
                    }).catch(() => {});
                }}
            />
        </div>
    }
}

export class MainPage extends Component {

    render() {
        return <Provider create={() => {
            return new MainVM()
        }} render={(vm: MainVM) => {
            return <WKLayout onRenderTab={(size) => {
                // if (size === ScreenSize.small) {
                //     return <TabLowScreen vm={vm}></TabLowScreen>
                // }
                return <TabNormalScreen vm={vm} />
            }} contentLeft={<MainContentLeft vm={vm} />} onRightContext={(context) => {
                WKApp.routeRight.setPush = (view) => {
                    context.push(view)
                }
                WKApp.routeRight.setReplaceToRoot = (view) => {
                    context.replaceToRoot(view)
                }
                WKApp.routeRight.setPop = () => {
                    context.pop()
                }
                WKApp.routeRight.setPopToRoot = () => {
                    context.popToRoot()
                }
            }} onLeftContext={(context) => {
                WKApp.routeLeft.setPush = (view) => {
                    context.push(view)
                }
                WKApp.routeLeft.setReplaceToRoot = (view) => {
                    context.replaceToRoot(view)
                }
                WKApp.routeLeft.setPop = () => {
                    context.pop()
                }
                WKApp.routeLeft.setPopToRoot = () => {
                    context.popToRoot()
                }
            }} contentRight={<div className="wk-chat-empty-hologram">
                <svg width="280" height="220" viewBox="0 0 320 250">
                    <defs>
                        <linearGradient id="es-a1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.06"/>
                            <stop offset="100%" stopColor="#00D4AA" stopOpacity="0.04"/>
                        </linearGradient>
                        <linearGradient id="es-a2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#7C5CFC"/>
                            <stop offset="100%" stopColor="#00D4AA"/>
                        </linearGradient>
                        <radialGradient id="es-a3" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.1"/>
                            <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0"/>
                        </radialGradient>
                    </defs>
                    <circle cx="160" cy="125" r="100" fill="url(#es-a1)"/>
                    {/* 左侧人节点 */}
                    <circle cx="55" cy="70" r="16" fill="white" stroke="#00D4AA" strokeWidth="1.5" opacity="0.65"/>
                    <circle cx="55" cy="70" r="5" fill="#00D4AA" opacity="0.25"/>
                    <circle cx="40" cy="130" r="12" fill="white" stroke="#00D4AA" strokeWidth="1.2" opacity="0.45"/>
                    <circle cx="40" cy="130" r="3.5" fill="#00D4AA" opacity="0.18"/>
                    <circle cx="65" cy="180" r="13" fill="white" stroke="#00D4AA" strokeWidth="1.3" opacity="0.5"/>
                    <circle cx="65" cy="180" r="4" fill="#00D4AA" opacity="0.2"/>
                    {/* 右侧AI节点 */}
                    <rect x="245" y="55" width="30" height="30" rx="7" fill="white" stroke="#7C5CFC" strokeWidth="1.5" opacity="0.65"/>
                    <circle cx="260" cy="70" r="5" fill="#7C5CFC" opacity="0.25"/>
                    <rect x="255" y="118" width="26" height="26" rx="6" fill="white" stroke="#7C5CFC" strokeWidth="1.2" opacity="0.45"/>
                    <circle cx="268" cy="131" r="3.5" fill="#7C5CFC" opacity="0.18"/>
                    <rect x="240" y="172" width="28" height="28" rx="6.5" fill="white" stroke="#7C5CFC" strokeWidth="1.3" opacity="0.5"/>
                    <circle cx="254" cy="186" r="4" fill="#7C5CFC" opacity="0.2"/>
                    {/* 中心光核 */}
                    <circle cx="160" cy="125" r="26" fill="url(#es-a3)"/>
                    <circle cx="160" cy="125" r="14" fill="white" stroke="url(#es-a2)" strokeWidth="1.8" opacity="0.75"/>
                    <circle cx="160" cy="125" r="5" fill="url(#es-a2)" opacity="0.35" className="wk-hologram-pulse"/>
                    {/* 脉冲连线 */}
                    <line x1="71" y1="72" x2="146" y2="122" stroke="#00D4AA" strokeWidth="1" strokeDasharray="4,6" opacity="0.3" className="wk-hologram-dash"/>
                    <line x1="52" y1="130" x2="146" y2="126" stroke="#00D4AA" strokeWidth="0.8" strokeDasharray="4,6" opacity="0.22" className="wk-hologram-dash"/>
                    <line x1="78" y1="178" x2="148" y2="130" stroke="#00D4AA" strokeWidth="0.8" strokeDasharray="4,6" opacity="0.18" className="wk-hologram-dash"/>
                    <line x1="245" y1="70" x2="174" y2="122" stroke="#7C5CFC" strokeWidth="1" strokeDasharray="4,6" opacity="0.3" className="wk-hologram-dash"/>
                    <line x1="255" y1="131" x2="174" y2="126" stroke="#7C5CFC" strokeWidth="0.8" strokeDasharray="4,6" opacity="0.22" className="wk-hologram-dash"/>
                    <line x1="240" y1="186" x2="172" y2="130" stroke="#7C5CFC" strokeWidth="0.8" strokeDasharray="4,6" opacity="0.18" className="wk-hologram-dash"/>
                    {/* 脉冲光点 */}
                    <circle cx="108" cy="98" r="2" fill="#00D4AA" opacity="0.4" className="wk-hologram-pulse"/>
                    <circle cx="210" cy="98" r="2" fill="#7C5CFC" opacity="0.4" className="wk-hologram-pulse"/>
                </svg>
                <div className="empty-text">选择对话，激活连接</div>
                <div className="empty-hint">人与 AI 在这里汇聚 ✦</div>
            </div>} />
        }}>

        </Provider>
    }
}