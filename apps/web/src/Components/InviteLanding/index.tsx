import React, { Component } from "react";
import { WKApp } from "@dmwork/base";
import { Button, Spin, Toast } from "@douyinfe/semi-ui";
import "./index.css";

interface InviteLandingProps {
    inviteCode: string;
}

interface InviteInfo {
    invite_code: string;
    space_id: string;
    space_name: string;
    creator: string;
    max_uses: number;
    used_count: number;
    expires_at: string;
}

interface InviteLandingState {
    loading: boolean;
    info?: InviteInfo;
    error?: string;
    joining: boolean;
    memberCount: number;
}

export default class InviteLanding extends Component<InviteLandingProps, InviteLandingState> {
    state: InviteLandingState = { loading: true, joining: false, memberCount: 0 };

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
            // Load member count
            try {
                const membersResp = await fetch(`${WKApp.apiClient.config.apiURL}space/invite/${this.props.inviteCode}`);
                if (membersResp.ok) {
                    const data = await membersResp.json();
                    this.setState({ memberCount: data.used_count || 0 });
                }
            } catch {}
        } catch (e) {
            this.setState({ loading: false, error: "网络错误" });
        }
    }

    async handleJoin() {
        if (!WKApp.shared.isLogined()) {
            // Save invite code and redirect to login
            localStorage.setItem("pendingInviteCode", this.props.inviteCode);
            const basePath = window.location.pathname.replace(/\/+$/, '') || '';
            window.location.href = `${window.location.origin}${basePath}/login`;
            return;
        }

        this.setState({ joining: true });
        try {
            await WKApp.apiClient.post(`/space/join`, { invite_code: this.props.inviteCode });
            Toast.success("加入成功！");
            // Remove invite param and reload
            const url = new URL(window.location.href);
            url.searchParams.delete("invite");
            localStorage.removeItem("pendingInviteCode");
            window.location.href = url.toString();
        } catch (e: any) {
            Toast.error(e?.msg || "加入失败");
            this.setState({ joining: false });
        }
    }

    render() {
        const { loading, info, error, joining } = this.state;
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

        if (loading) {
            return (
                <div className="invite-landing">
                    <Spin size="large" />
                </div>
            );
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
                    <div className="invite-landing-members">{info.used_count} 位成员</div>
                    <Button
                        type="primary"
                        size="large"
                        loading={joining}
                        className="invite-landing-btn"
                        onClick={() => this.handleJoin()}
                    >
                        {WKApp.shared.isLogined() ? "加入 Space" : "登录并加入"}
                    </Button>
                </div>
            </div>
        );
    }
}
