import React, { Component } from "react";
import { WKApp, WKBase, Provider, ErrorBoundary } from "@dmwork/base"
import { listen } from '@tauri-apps/api/event'
import { MainPage } from "../Pages/Main";
import SpaceGate from "../Components/SpaceGate";
import { Notification as NotificationUI, Button } from '@douyinfe/semi-ui';
import { checkUpdate, installUpdate, UpdateManifest } from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'
import { os } from "@tauri-apps/api";
import { getSid, getQueryParam } from "@dmwork/base";
import InviteLanding from "../Components/InviteLanding";

export default class AppLayout extends Component {
    onLogin!: () => void
    componentDidMount() {
        this.onLogin = () => {
            try { Notification.requestPermission() } catch(_) {} // 请求通知权限（iOS 不支持，忽略错误）
            const basePath = (window.location.pathname.replace(/\/login\/?$/, '').replace(/\/index\.html$/, '') || '/').replace(/\/+$/, '')
            // 保留原始 sid（如果有），不随机生成新的
            const existingSid = getQueryParam("sid") || ""
            const sidParam = existingSid ? `?sid=${existingSid}` : ""

            const goMain = () => {
                window.location.href = `${window.location.origin}${basePath}/${sidParam}`
            }

            // 检查是否有待处理的邀请码（验证格式防止 XSS/Open Redirect）
            const pendingInvite = localStorage.getItem("pendingInviteCode");
            if (pendingInvite && /^[a-zA-Z0-9_-]+$/.test(pendingInvite)) {
                // 自动加入 Space，不再跳回邀请页
                WKApp.apiClient.post(`/space/join`, { invite_code: pendingInvite })
                    .then((result: any) => {
                        localStorage.removeItem("pendingInviteCode");
                        const spaceId = result?.space_id;
                        if (spaceId) {
                            localStorage.setItem('currentSpaceId', spaceId);
                        }
                    })
                    .catch((e: any) => {
                        const msg = e?.msg || '';
                        if (msg.includes('已满') || msg.includes('SPACE_FULL')) {
                            // 满员：不清 pendingInviteCode，留重试机会
                            import('@douyinfe/semi-ui').then(({ Toast }) => Toast.error('空间已满，无法加入'));
                        } else if (msg.includes('已是成员') || msg.includes('already')) {
                            // 已是成员：静默处理
                            localStorage.removeItem("pendingInviteCode");
                            if (e?.space_id) localStorage.setItem('currentSpaceId', e.space_id);
                        } else {
                            // 邀请码无效/过期
                            localStorage.removeItem("pendingInviteCode");
                            console.warn('Auto-join space failed:', msg);
                        }
                    })
                    .finally(() => {
                        goMain();
                    });
                return;
            }
            goMain()
        }
        WKApp.endpoints.addOnLogin(this.onLogin)

        this.tauriCheckUpdate()

    }

    componentWillUnmount() {
        WKApp.endpoints.removeOnLogin(this.onLogin)
    }

    async tauriCheckUpdate() {
        if(!(window as any).__TAURI_IPC__) {
            return
        }

        listen('tauri://update-status', function (res) {
        })

        try {
            const { shouldUpdate, manifest } = await checkUpdate()
            if (shouldUpdate) {
                // display dialog
                if(await os.platform() === "darwin") { // mac 自动下载更新
                    await installUpdate()
                }
                this.showUpdateUI(manifest)

            }
        } catch (error) {
            console.error('Update check failed:', error);
        }
    }

    showUpdateUI(manifest: UpdateManifest) {
      const notifyID =  NotificationUI.info({
            title: `有新版本 ${manifest.version}`,
            duration: 0,
            content: (
                <>
                    <div>{manifest.body}</div>
                    <div style={{ marginTop: 8 }}>
                        <Button onClick={ async () => {
                           // install complete, restart app
                           if(await os.platform() !== "darwin") {
                                await installUpdate()
                            }
                          await relaunch()
                        }}>更新</Button>
                        <Button onClick={()=>{
                            NotificationUI.close(notifyID)
                        }} type="secondary" style={{ marginLeft: 20 }}>
                            下次
                        </Button>
                    </div>
                </>
            ),
        })
    }

    showProgressUI() {

    }

    render() {
        // 邀请链接检测
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get("invite");
        if (inviteCode) {
            // 确保登录信息已加载（邀请页在 Provider 之前渲染）
            if (!WKApp.loginInfo.token) {
                WKApp.loginInfo.load();
            }
            // 如果 URL 没有 ?sid= 或 sid 不匹配，尝试从 localStorage 找正确的 token
            if (!WKApp.loginInfo.token) {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith("token") && key !== "token") {
                        const val = localStorage.getItem(key);
                        if (val) {
                            // 直接设置 token 和相关信息，不重定向
                            const sid = key.substring(5);
                            WKApp.loginInfo.token = val;
                            WKApp.loginInfo.uid = localStorage.getItem("uid" + sid) || "";
                            WKApp.loginInfo.name = localStorage.getItem("name" + sid) || "";
                            break;
                        }
                    }
                }
            }
            return <InviteLanding inviteCode={inviteCode} />;
        }

        return <Provider create={() => {
            return WKApp.shared
        }} render={(vm: WKApp): any => {
            if (!WKApp.shared.isLogined() || window.location.pathname.endsWith('/login')) {
                const loginComponent = WKApp.route.get("/login")
                if (!loginComponent) {
                    return <div>没有登录模块！</div>
                }
                return loginComponent
            }
            // Space 模式：检查用户是否属于至少一个 Space
            if (!WKApp.shared.currentSpaceId) {
                // 尝试从 localStorage 恢复
                const cached = localStorage.getItem("currentSpaceId");
                if (cached) {
                    WKApp.shared.currentSpaceId = cached;
                    WKApp.shared.spaceChecked = true;
                }
            }
            if (!WKApp.shared.currentSpaceId && !WKApp.shared.spaceChecked) {
                return <SpaceGate />
            }
            return <ErrorBoundary moduleName="应用">
                <WKBase onContext={(ctx) => {
                    WKApp.shared.baseContext = ctx
                }}>
                    <MainPage />
                </WKBase>
            </ErrorBoundary>
        }} />

    }
}