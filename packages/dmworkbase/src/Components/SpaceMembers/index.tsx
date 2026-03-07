import React, { Component } from "react";
import { Toast } from "@douyinfe/semi-ui";
import { SpaceMember, SpaceService, Space } from "../../Service/SpaceService";
import WKApp from "../../App";
import "./index.css";

export interface SpaceMembersProps {
    space: Space;
    onClose: () => void;
}

interface SpaceMembersState {
    members: SpaceMember[];
    loading: boolean;
}

const RoleLabels: Record<number, string> = {
    1: "创建者",
    2: "管理员",
    3: "成员",
};

const RoleColors: Record<number, string> = {
    1: "#fa709a",
    2: "#667eea",
    3: "#999",
};

export default class SpaceMembers extends Component<SpaceMembersProps, SpaceMembersState> {
    constructor(props: SpaceMembersProps) {
        super(props);
        this.state = {
            members: [],
            loading: false,
        };
    }

    componentDidMount() {
        this.loadMembers();
    }

    loadMembers = async () => {
        this.setState({ loading: true });
        try {
            const members = await SpaceService.shared.getMembers(this.props.space.space_id);
            this.setState({ members, loading: false });
        } catch {
            this.setState({ loading: false });
        }
    };

    handleInvite = async () => {
        try {
            const resp = await SpaceService.shared.createInvite(this.props.space.space_id);
            navigator.clipboard.writeText(resp.invite_url).then(() => {
                Toast.success("邀请链接已复制");
            });
        } catch {
            Toast.error("获取邀请链接失败");
        }
    };

    handleRemove = async (uid: string) => {
        try {
            await SpaceService.shared.removeMembers(this.props.space.space_id, [uid]);
            this.setState({ members: this.state.members.filter((m) => m.uid !== uid) });
            Toast.success("已移除成员");
        } catch {
            Toast.error("移除失败");
        }
    };

    handleRoleChange = async (uid: string, role: number) => {
        try {
            await SpaceService.shared.updateMemberRole(this.props.space.space_id, uid, role);
            this.setState({
                members: this.state.members.map((m) =>
                    m.uid === uid ? { ...m, role } : m
                ),
            });
            Toast.success("角色已更新");
        } catch {
            Toast.error("更新角色失败");
        }
    };

    isAdmin() {
        return this.props.space.role <= 2;
    }

    render() {
        const { space, onClose } = this.props;
        const { members, loading } = this.state;
        const myUid = WKApp.loginInfo.uid;
        const isAdmin = this.isAdmin();

        return (
            <div className="wk-spacemembers">
                <div className="wk-spacemembers-header">
                    <div className="wk-spacemembers-header-left">
                        <div className="wk-spacemembers-back" onClick={onClose}>
                            ←
                        </div>
                        <span className="wk-spacemembers-title">{space.name} - 成员</span>
                    </div>
                    <button className="wk-spacemembers-invite-btn" onClick={this.handleInvite}>
                        邀请
                    </button>
                </div>
                <div className="wk-spacemembers-list">
                    {loading ? (
                        <div className="wk-spacemembers-loading">加载中...</div>
                    ) : (
                        members.map((member) => (
                            <div key={member.uid} className="wk-spacemembers-item">
                                <div className="wk-spacemembers-item-left">
                                    <img
                                        className="wk-spacemembers-item-avatar"
                                        alt=""
                                        src={member.avatar || WKApp.shared.avatarUser(member.uid)}
                                    />
                                    <div className="wk-spacemembers-item-info">
                                        <span className="wk-spacemembers-item-name">{member.name}</span>
                                        <span
                                            className="wk-spacemembers-item-role"
                                            style={{ color: RoleColors[member.role] }}
                                        >
                                            {RoleLabels[member.role]}
                                        </span>
                                    </div>
                                </div>
                                {isAdmin && member.uid !== myUid && member.role !== 1 && (
                                    <div className="wk-spacemembers-item-actions">
                                        {member.role === 3 && (
                                            <button
                                                className="wk-spacemembers-action-btn"
                                                onClick={() => this.handleRoleChange(member.uid, 2)}
                                            >
                                                设为管理员
                                            </button>
                                        )}
                                        {member.role === 2 && (
                                            <button
                                                className="wk-spacemembers-action-btn"
                                                onClick={() => this.handleRoleChange(member.uid, 3)}
                                            >
                                                取消管理员
                                            </button>
                                        )}
                                        <button
                                            className="wk-spacemembers-action-btn wk-spacemembers-action-danger"
                                            onClick={() => this.handleRemove(member.uid)}
                                        >
                                            移除
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }
}
