import React, { Component } from "react";
import { WKApp } from "@dmwork/base";
import { Button, Input, Spin, Toast, Divider } from "@douyinfe/semi-ui";
import "./index.css";

interface InviteLandingProps {
    inviteCode: string;
}

interface InviteInfo {
    invite_code: string;
    space_id: string;
    space_name: string;
    member_count: number;
}

interface InviteLandingState {
    loading: boolean;
    info?: InviteInfo;
    error?: string;
    joining: boolean;
    // login form
    loginUsername: string;
    loginPassword: string;
    loginLoading: boolean;
    // register form
    regUsername: string;
    regPassword: string;
    regLoading: boolean;
}

export default class InviteLanding extends Component<InviteLandingProps, InviteLandingState> {
    state: InviteLandingState = {
        loading: true, joining: false,
        loginUsername: '', loginPassword: '', loginLoading: false,
        regUsername: '', regPassword: '', regLoading: false,
    };

    componentDidMount() {
        this.loadInviteInfo();
    }

    async loadInviteInfo() {
        try {
            const resp = await fetch(`${WKApp.apiClient.config.apiURL}space/invite/${this.props.inviteCode}`);
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                this.setState({ loading: false, error: err.msg || "邀请码无效" });
                return;
            }
            const info = await resp.json();
            this.setState({ loading: false, info });
        } catch (e) {
            this.setState({ loading: false, error: "网络错误" });
        }
    }

    async handleJoin() {
        this.setState({ joining: true });
        try {
            await WKApp.apiClient.post(`/space/join`, { invite_code: this.props.inviteCode });
            Toast.success("加入成功！");
            localStorage.removeItem("pendingInviteCode");
            const url = new URL(window.location.href);
            url.searchParams.delete("invite");
            window.location.href = url.toString();
        } catch (e: any) {
            Toast.error(e?.msg || "加入失败");
            this.setState({ joining: false });
        }
    }

    async handleLogin() {
        const { loginUsername, loginPassword } = this.state;
        if (!loginUsername || !loginPassword) { Toast.warning("请输入用户名和密码"); return; }
        this.setState({ loginLoading: true });
        try {
            const resp = await fetch(`${WKApp.apiClient.config.apiURL}user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUsername, password: loginPassword }),
            });
            const data = await resp.json();
            if (!resp.ok) { Toast.error(data.msg || "登录失败"); this.setState({ loginLoading: false }); return; }
            // Save login info
            WKApp.loginInfo.uid = data.uid;
            WKApp.loginInfo.token = data.token;
            WKApp.loginInfo.name = data.name;
            WKApp.loginInfo.shortNo = data.short_no;
            WKApp.loginInfo.save();
            Toast.success("登录成功");
            // Join space then reload
            await this.joinAfterAuth();
        } catch (e) {
            Toast.error("网络错误");
            this.setState({ loginLoading: false });
        }
    }

    async handleRegister() {
        const { regUsername, regPassword } = this.state;
        if (!regUsername || !regPassword) { Toast.warning("请输入用户名和密码"); return; }
        this.setState({ regLoading: true });
        try {
            // Register using usernameregister API (no code required)
            const regResp = await fetch(`${WKApp.apiClient.config.apiURL}user/usernameregister`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: regUsername, name: regUsername, password: regPassword, flag: 1 }),
            });
            const regData = await regResp.json();
            if (!regResp.ok) { Toast.error(regData.msg || "注册失败"); this.setState({ regLoading: false }); return; }
            // Auto login after register
            const loginResp = await fetch(`${WKApp.apiClient.config.apiURL}user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: regUsername, password: regPassword }),
            });
            const loginData = await loginResp.json();
            if (!loginResp.ok) { Toast.error("注册成功但登录失败"); this.setState({ regLoading: false }); return; }
            WKApp.loginInfo.uid = loginData.uid;
            WKApp.loginInfo.token = loginData.token;
            WKApp.loginInfo.name = loginData.name;
            WKApp.loginInfo.shortNo = loginData.short_no;
            WKApp.loginInfo.save();
            Toast.success("注册成功");
            await this.joinAfterAuth();
        } catch (e) {
            Toast.error("网络错误");
            this.setState({ regLoading: false });
        }
    }

    async joinAfterAuth() {
        try {
            // Use raw fetch with token since WKApp.apiClient may not have updated token yet
            await fetch(`${WKApp.apiClient.config.apiURL}space/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'token': WKApp.loginInfo.token || '' },
                body: JSON.stringify({ invite_code: this.props.inviteCode }),
            });
        } catch {}
        localStorage.removeItem("pendingInviteCode");
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        window.location.href = url.toString();
    }

    render() {
        const { loading, info, error, joining } = this.state;
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
        const isLoggedIn = WKApp.shared.isLogined();

        if (loading) {
            return <div className="invite-landing"><Spin size="large" /></div>;
        }

        if (error || !info) {
            return (
                <div className="invite-landing">
                    <div className="invite-landing-card">
                        <div className="invite-landing-error">❌ {error || "邀请码无效"}</div>
                        <Button onClick={() => {
                            const url = new URL(window.location.href);
                            url.searchParams.delete("invite");
                            window.location.href = url.toString();
                        }}>返回</Button>
                    </div>
                </div>
            );
        }

        const colorIndex = info.space_name.charCodeAt(0) % colors.length;

        return (
            <div className="invite-landing">
                <div className="invite-landing-card">
                    <div className="invite-landing-icon" style={{ backgroundColor: colors[colorIndex] }}>
                        {info.space_name.charAt(0)}
                    </div>
                    <div className="invite-landing-name">{info.space_name}</div>
                    <div className="invite-landing-subtitle">邀请你加入</div>
                    <div className="invite-landing-members">{info.member_count} 位成员</div>

                    {isLoggedIn ? (
                        <Button type="primary" size="large" loading={joining}
                            className="invite-landing-btn" onClick={() => this.handleJoin()}>
                            加入 Space
                        </Button>
                    ) : (
                        <>
                            <Divider>已有账号？</Divider>
                            <div className="invite-landing-form">
                                <Input placeholder="用户名" value={this.state.loginUsername}
                                    onChange={v => this.setState({ loginUsername: v })} />
                                <Input placeholder="密码" type="password" value={this.state.loginPassword}
                                    onChange={v => this.setState({ loginPassword: v })} />
                                <Button type="primary" size="large" loading={this.state.loginLoading}
                                    className="invite-landing-btn" onClick={() => this.handleLogin()}>
                                    登录并加入
                                </Button>
                            </div>
                            <Divider>新用户</Divider>
                            <div className="invite-landing-form">
                                <Input placeholder="用户名" value={this.state.regUsername}
                                    onChange={v => this.setState({ regUsername: v })} />
                                <Input placeholder="密码" type="password" value={this.state.regPassword}
                                    onChange={v => this.setState({ regPassword: v })} />
                                <Button type="secondary" size="large" loading={this.state.regLoading}
                                    className="invite-landing-btn" onClick={() => this.handleRegister()}>
                                    注册并加入
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }
}
