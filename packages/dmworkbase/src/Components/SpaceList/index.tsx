import React, { Component } from "react";
import { IconPlus } from "@douyinfe/semi-icons";
import { Spin } from "@douyinfe/semi-ui";
import { Space, SpaceService } from "../../Service/SpaceService";
import "./index.css";

export interface SpaceListProps {
    selectedSpaceId?: string;
    onSelect: (space: Space | undefined) => void;
    onCreateClick: () => void;
}

interface SpaceListState {
    spaces: Space[];
    loading: boolean;
}

export default class SpaceList extends Component<SpaceListProps, SpaceListState> {
    constructor(props: SpaceListProps) {
        super(props);
        this.state = {
            spaces: [],
            loading: false,
        };
    }

    componentDidMount() {
        this.loadSpaces();
    }

    loadSpaces = async () => {
        this.setState({ loading: true });
        try {
            const spaces = await SpaceService.shared.getMySpaces();
            this.setState({ spaces, loading: false });
        } catch {
            this.setState({ loading: false });
        }
    };

    renderSpaceAvatar(space: Space) {
        if (space.logo) {
            return <img className="wk-spacelist-item-avatar-img" alt="" src={space.logo} />;
        }
        const colors = ["#667eea", "#764ba2", "#f093fb", "#4facfe", "#43e97b", "#fa709a", "#fee140", "#a18cd1"];
        const colorIndex = space.name.charCodeAt(0) % colors.length;
        return (
            <div className="wk-spacelist-item-avatar-letter" style={{ backgroundColor: colors[colorIndex] }}>
                {space.name.charAt(0).toUpperCase()}
            </div>
        );
    }

    render() {
        const { selectedSpaceId, onSelect, onCreateClick } = this.props;
        const { spaces, loading } = this.state;

        return (
            <div className="wk-spacelist">
                <div className="wk-spacelist-header">
                    <span className="wk-spacelist-title">Space</span>
                    <div className="wk-spacelist-add" onClick={onCreateClick}>
                        <IconPlus size="small" />
                    </div>
                </div>
                {loading ? (
                    <div className="wk-spacelist-loading">
                        <Spin size="small" />
                    </div>
                ) : (
                    <div className="wk-spacelist-items">
                        <div
                            className={`wk-spacelist-item ${!selectedSpaceId ? "wk-spacelist-item-selected" : ""}`}
                            onClick={() => onSelect(undefined)}
                        >
                            <div className="wk-spacelist-item-avatar">
                                <div className="wk-spacelist-item-avatar-letter wk-spacelist-all-icon">
                                    All
                                </div>
                            </div>
                            <div className="wk-spacelist-item-info">
                                <div className="wk-spacelist-item-name">全部会话</div>
                            </div>
                        </div>
                        {spaces.map((space) => (
                            <div
                                key={space.space_id}
                                className={`wk-spacelist-item ${selectedSpaceId === space.space_id ? "wk-spacelist-item-selected" : ""}`}
                                onClick={() => onSelect(space)}
                            >
                                <div className="wk-spacelist-item-avatar">
                                    {this.renderSpaceAvatar(space)}
                                </div>
                                <div className="wk-spacelist-item-info">
                                    <div className="wk-spacelist-item-name">{space.name}</div>
                                    <div className="wk-spacelist-item-count">{space.member_count} 人</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
}
