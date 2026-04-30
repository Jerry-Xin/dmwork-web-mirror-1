import React, { Component } from "react";
import { Modal, Select, Button } from "@douyinfe/semi-ui";
import type { ScheduleConfig } from "../types/summary";

interface Props {
    visible: boolean;
    value: ScheduleConfig;
    onConfirm: (config: ScheduleConfig) => void;
    onCancel: () => void;
}

interface State {
    local: ScheduleConfig;
}

const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    const val = `${String(h).padStart(2, "0")}:${m}`;
    return { value: val, label: val };
});

const weekDayOptions = [
    { value: 1, label: "周一" },
    { value: 2, label: "周二" },
    { value: 3, label: "周三" },
    { value: 4, label: "周四" },
    { value: 5, label: "周五" },
    { value: 6, label: "周六" },
    { value: 7, label: "周日" },
];

const dayOfMonthOptions = Array.from({ length: 28 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}日`,
}));

export default class ScheduleConfigModal extends Component<Props, State> {
    state: State = {
        local: { period: "daily", time: "09:00" },
    };

    componentDidUpdate(prevProps: Props) {
        if (this.props.visible && !prevProps.visible) {
            this.setState({ local: { ...this.props.value } });
        }
    }

    handleConfirm = () => {
        this.props.onConfirm(this.state.local);
    };

    updateLocal(patch: Partial<ScheduleConfig>) {
        this.setState({ local: { ...this.state.local, ...patch } });
    }

    handlePeriodChange = (v: string | number | any[] | Record<string, any>) => {
        const period = v as ScheduleConfig["period"];
        const next: ScheduleConfig = { period, time: this.state.local.time };
        if (period === "weekly") {
            next.dayOfWeek = this.state.local.dayOfWeek ?? 1;
        } else if (period === "monthly") {
            next.dayOfMonth = this.state.local.dayOfMonth ?? 1;
        }
        this.setState({ local: next });
    };

    renderTimeRow() {
        const { local } = this.state;

        const rowStyle: React.CSSProperties = {
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
        };

        const prefixStyle: React.CSSProperties = {
            whiteSpace: "nowrap",
            color: "var(--semi-color-text-2)",
            fontSize: 14,
        };

        if (local.period === "daily") {
            return (
                <div style={rowStyle}>
                    <span style={prefixStyle}>每天</span>
                    <Select
                        value={local.time}
                        onChange={(v) => this.updateLocal({ time: v as string })}
                        style={{ flex: 1 }}
                        optionList={timeOptions}
                    />
                </div>
            );
        }

        if (local.period === "weekly") {
            return (
                <div style={rowStyle}>
                    <span style={prefixStyle}>每周</span>
                    <Select
                        value={local.dayOfWeek ?? 1}
                        onChange={(v) => this.updateLocal({ dayOfWeek: v as number })}
                        style={{ flex: 1 }}
                        optionList={weekDayOptions}
                    />
                    <Select
                        value={local.time}
                        onChange={(v) => this.updateLocal({ time: v as string })}
                        style={{ flex: 1 }}
                        optionList={timeOptions}
                    />
                </div>
            );
        }

        // monthly
        return (
            <div style={rowStyle}>
                <span style={prefixStyle}>每月</span>
                <Select
                    value={local.dayOfMonth ?? 1}
                    onChange={(v) => this.updateLocal({ dayOfMonth: v as number })}
                    style={{ flex: 1 }}
                    optionList={dayOfMonthOptions}
                />
                <Select
                    value={local.time}
                    onChange={(v) => this.updateLocal({ time: v as string })}
                    style={{ flex: 1 }}
                    optionList={timeOptions}
                />
            </div>
        );
    }

    render() {
        const { visible, onCancel } = this.props;
        const { local } = this.state;

        const labelStyle: React.CSSProperties = {
            width: 50,
            flexShrink: 0,
            color: "var(--semi-color-text-1)",
            fontSize: 14,
        };

        const rowStyle: React.CSSProperties = {
            display: "flex",
            alignItems: "center",
            marginBottom: 16,
        };

        return (
            <Modal
                title="定时更新"
                visible={visible}
                onCancel={onCancel}
                width={420}
                footer={
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <Button onClick={onCancel}>取消</Button>
                        <Button theme="solid" onClick={this.handleConfirm}>保存</Button>
                    </div>
                }
            >
                <div style={{ color: "var(--semi-color-text-2)", fontSize: 13, marginBottom: 20 }}>
                    后续将自动更新总结内容并通知你
                </div>

                {/* 频率 */}
                <div style={rowStyle}>
                    <span style={labelStyle}>频率</span>
                    <Select
                        value={local.period}
                        onChange={this.handlePeriodChange}
                        style={{ flex: 1 }}
                        optionList={[
                            { value: "daily", label: "按天更新" },
                            { value: "weekly", label: "按周更新" },
                            { value: "monthly", label: "按月更新" },
                        ]}
                    />
                </div>

                {/* 时间 */}
                <div style={{ ...rowStyle, marginBottom: 0 }}>
                    <span style={labelStyle}>时间</span>
                    {this.renderTimeRow()}
                </div>
            </Modal>
        );
    }
}
