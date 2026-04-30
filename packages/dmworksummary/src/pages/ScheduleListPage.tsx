import React, { Component } from "react";
import {
    Button,
    Spin,
    Toast,
    Modal,
    Switch,
    Popconfirm,
    Tag,
    Banner,
} from "@douyinfe/semi-ui";
import {
    IconArrowLeft,
    IconPlus,
    IconDelete,
    IconEdit,
} from "@douyinfe/semi-icons";
import WKApp from "@dmwork/base/src/App";
import * as api from "../api/summaryApi";
import type {
    ScheduleItem,
    CreateScheduleParams,
    UpdateScheduleParams,
} from "../types/summary";
import {
    getModeLabel,
    describeCron,
    getTimeRangeTypeLabel,
} from "../utils/summaryHelpers";
import ScheduleForm from "../components/ScheduleForm";

interface ScheduleListPageState {
    schedules: ScheduleItem[];
    loading: boolean;
    error: string | null;
    showCreateModal: boolean;
    showEditModal: boolean;
    editingSchedule: ScheduleItem | null;
    formLoading: boolean;
}

export default class ScheduleListPage extends Component<{}, ScheduleListPageState> {
    state: ScheduleListPageState = {
        schedules: [],
        loading: false,
        error: null,
        showCreateModal: false,
        showEditModal: false,
        editingSchedule: null,
        formLoading: false,
    };

    componentDidMount() {
        this.loadData();
    }

    async loadData() {
        this.setState({ loading: true, error: null });
        try {
            const schedules = await api.listSchedules();
            this.setState({ schedules, loading: false });
        } catch (err: any) {
            this.setState({ error: err.message || "加载失败", loading: false });
        }
    }

    handleBack = () => {
        WKApp.routeLeft.popToRoot();
    };

    handleCreate = async (params: CreateScheduleParams) => {
        this.setState({ formLoading: true });
        try {
            await api.createSchedule(params);
            Toast.success("定时配置已创建");
            this.setState({ showCreateModal: false, formLoading: false });
            this.loadData();
        } catch (err: any) {
            Toast.error(err.message || "创建失败");
            this.setState({ formLoading: false });
        }
    };

    handleUpdate = async (params: CreateScheduleParams) => {
        const { editingSchedule } = this.state;
        if (!editingSchedule) return;
        this.setState({ formLoading: true });
        try {
            const updateParams: UpdateScheduleParams = {
                title: params.title,
                summary_mode: params.summary_mode,
                cron_expr: params.cron_expr,
                time_range_type: params.time_range_type,
                sources: params.sources,
            };
            await api.updateSchedule(editingSchedule.schedule_id, updateParams);
            Toast.success("定时配置已更新");
            this.setState({ showEditModal: false, editingSchedule: null, formLoading: false });
            this.loadData();
        } catch (err: any) {
            Toast.error(err.message || "更新失败");
            this.setState({ formLoading: false });
        }
    };

    handleDelete = async (id: number) => {
        try {
            await api.deleteSchedule(id);
            Toast.success("已删除");
            this.loadData();
        } catch (err: any) {
            Toast.error(err.message || "删除失败");
        }
    };

    handleToggle = async (id: number, isActive: boolean) => {
        try {
            await api.toggleSchedule(id, isActive);
            Toast.success(isActive ? "已启用" : "已暂停");
            this.loadData();
        } catch (err: any) {
            Toast.error(err.message || "操作失败");
        }
    };

    render() {
        const { schedules, loading, error, showCreateModal, showEditModal, editingSchedule, formLoading } = this.state;

        return (
            <div className="summary-schedule-page">
                <div className="summary-schedule-header">
                    <Button icon={<IconArrowLeft />} theme="borderless" onClick={this.handleBack} />
                    <h2>定时总结配置</h2>
                    <Button
                        icon={<IconPlus />}
                        theme="solid"
                        onClick={() => this.setState({ showCreateModal: true })}
                    >
                        新建
                    </Button>
                </div>

                {error && (
                    <Banner
                        type="warning"
                        description={error}
                        closeIcon={null}
                        style={{ marginBottom: 16 }}
                        fullMode={false}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span>加载失败</span>
                            <Button size="small" onClick={() => this.loadData()}>重试</Button>
                        </div>
                    </Banner>
                )}

                {loading && (
                    <div className="summary-schedule-loading">
                        <Spin size="large" />
                    </div>
                )}

                {!loading && schedules.length === 0 && !error && (
                    <div className="summary-schedule-empty">
                        <p>暂无定时配置</p>
                        <Button theme="solid" onClick={() => this.setState({ showCreateModal: true })}>
                            创建第一个定时任务
                        </Button>
                    </div>
                )}

                {!loading && schedules.length > 0 && (
                    <div className="summary-schedule-list">
                        {schedules.map((item) => (
                            <div key={item.schedule_id} className="summary-schedule-card">
                                <div className="summary-schedule-card-header">
                                    <span className="summary-schedule-card-title">
                                        {item.title || `定时任务 #${item.schedule_id}`}
                                    </span>
                                    <Switch
                                        checked={item.is_active}
                                        onChange={(checked) => this.handleToggle(item.schedule_id, checked)}
                                        size="small"
                                    />
                                </div>
                                <div className="summary-schedule-card-meta">
                                    <Tag size="small" color="blue">{getModeLabel(item.summary_mode)}</Tag>
                                    <span style={{ marginLeft: 8 }}>{describeCron(item.cron_expr)}</span>
                                    <span style={{ marginLeft: 8, color: "var(--semi-color-text-2)" }}>
                                        {getTimeRangeTypeLabel(item.time_range_type)}
                                    </span>
                                </div>
                                <div className="summary-schedule-card-sources">
                                    来源：{item.sources.map((s) => s.source_name || s.source_id).join("、") || "-"}
                                </div>
                                <div className="summary-schedule-card-actions">
                                    <Button
                                        icon={<IconEdit />}
                                        size="small"
                                        theme="borderless"
                                        onClick={() => this.setState({
                                            showEditModal: true,
                                            editingSchedule: item,
                                        })}
                                    />
                                    <Popconfirm
                                        title="确认删除"
                                        content="确定要删除此定时配置吗？"
                                        onConfirm={() => this.handleDelete(item.schedule_id)}
                                    >
                                        <Button
                                            icon={<IconDelete />}
                                            size="small"
                                            theme="borderless"
                                            type="danger"
                                        />
                                    </Popconfirm>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Modal
                    title="新建定时配置"
                    visible={showCreateModal}
                    onCancel={() => this.setState({ showCreateModal: false })}
                    footer={null}
                    width={520}
                >
                    <ScheduleForm
                        onSubmit={this.handleCreate}
                        onCancel={() => this.setState({ showCreateModal: false })}
                        loading={formLoading}
                    />
                </Modal>

                <Modal
                    title="编辑定时配置"
                    visible={showEditModal}
                    onCancel={() => this.setState({ showEditModal: false, editingSchedule: null })}
                    footer={null}
                    width={520}
                >
                    {editingSchedule && (
                        <ScheduleForm
                            initialValues={{
                                title: editingSchedule.title,
                                summary_mode: editingSchedule.summary_mode,
                                cron_expr: editingSchedule.cron_expr,
                                time_range_type: editingSchedule.time_range_type,
                                sources: editingSchedule.sources,
                            }}
                            onSubmit={this.handleUpdate}
                            onCancel={() => this.setState({ showEditModal: false, editingSchedule: null })}
                            loading={formLoading}
                        />
                    )}
                </Modal>
            </div>
        );
    }
}
