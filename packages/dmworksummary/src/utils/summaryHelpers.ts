import {
    SummaryMode,
    TaskStatus,
    SourceType,
    ParticipantStatus,
    TimeRangeTypeLabels,
    type TaskStatusType,
    type SummaryModeType,
    type SourceTypeValue,
    type ScheduleConfig,
} from "../types/summary";

/** 任务状态 → 显示文本 */
export function getStatusLabel(status: TaskStatusType): string {
    switch (status) {
        case TaskStatus.PENDING: return "等待中";
        case TaskStatus.WAITING_CONFIRM: return "等待参与者";
        case TaskStatus.PROCESSING: return "生成中";
        case TaskStatus.COMPLETED: return "已完成";
        case TaskStatus.FAILED: return "失败";
        case TaskStatus.CANCELLED: return "已取消";
        default: return "未知";
    }
}

/** 任务状态 → Semi Tag 颜色 */
export function getStatusColor(status: TaskStatusType): string {
    switch (status) {
        case TaskStatus.PENDING: return "grey";
        case TaskStatus.WAITING_CONFIRM: return "amber";
        case TaskStatus.PROCESSING: return "blue";
        case TaskStatus.COMPLETED: return "green";
        case TaskStatus.FAILED: return "red";
        case TaskStatus.CANCELLED: return "grey";
        default: return "grey";
    }
}

/** 总结模式 → 显示文本 */
export function getModeLabel(mode: SummaryModeType): string {
    return mode === SummaryMode.BY_GROUP ? "按群总结" : "按人总结";
}

/** 信息来源类型 → 显示文本 */
export function getSourceTypeLabel(type: SourceTypeValue): string {
    switch (type) {
        case SourceType.GROUP_CHAT: return "群聊";
        case SourceType.THREAD: return "子区";
        case SourceType.DIRECT_MESSAGE: return "私聊";
        default: return "未知";
    }
}

/** 参与者状态 → 显示文本 */
export function getParticipantStatusLabel(status: number): string {
    switch (status) {
        case ParticipantStatus.PENDING: return "等待确认";
        case ParticipantStatus.CONFIRMED: return "已确认";
        case ParticipantStatus.DECLINED: return "已拒绝";
        default: return "未知";
    }
}

/** 时间范围类型 → 显示文本 */
export function getTimeRangeTypeLabel(type: number): string {
    return TimeRangeTypeLabels[type] || "未知";
}

/** 格式化日期 */
export function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 格式化日期（仅日期） */
export function formatDateOnly(dateStr: string | null | undefined): string {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 校验时间范围不超过 maxDays 天 */
export function validateTimeRange(start: Date, end: Date, maxDays = 31): string | null {
    if (end <= start) return "结束时间必须晚于开始时间";
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > maxDays) return `时间范围不能超过 ${maxDays} 天`;
    return null;
}

/** 任务是否可以取消 */
export function canCancel(status: TaskStatusType): boolean {
    return (
        status === TaskStatus.PENDING ||
        status === TaskStatus.WAITING_CONFIRM ||
        status === TaskStatus.PROCESSING
    );
}

/** 任务是否可以重新生成 */
export function canRegenerate(status: TaskStatusType): boolean {
    return (
        status === TaskStatus.COMPLETED ||
        status === TaskStatus.FAILED ||
        status === TaskStatus.CANCELLED
    );
}

/** 预设 cron 表达式选项 */
export const CRON_PRESETS = [
    { value: "0 9 * * *", label: "每天 09:00" },
    { value: "0 9 * * 1-5", label: "工作日 09:00" },
    { value: "0 9 * * 1", label: "每周一 09:00" },
    { value: "0 9 1 * *", label: "每月 1 日 09:00" },
];

/** cron 表达式 → 可读标签（用于详情页展示） */
export function cronToLabel(cron_expr: string): string {
    const parts = cron_expr.trim().split(/\s+/);
    if (parts.length !== 5) return cron_expr;
    const [minStr, hourStr, dom, , dow] = parts;
    const pad = (n: string) => n.padStart(2, "0");
    const timeStr = `${pad(hourStr)}:${pad(minStr)}`;
    const dowLabels = ["日", "一", "二", "三", "四", "五", "六"];

    if (dom !== "*") {
        // monthly: e.g. "0 9 27 * *"
        return `每月${dom}日 ${timeStr}`;
    }
    if (dow !== "*") {
        // weekly: e.g. "30 11 * * 1"
        const dowNum = parseInt(dow, 10);
        const label = dowLabels[dowNum] ?? dow;
        return `每周${label} ${timeStr}`;
    }
    // daily
    return `每天 ${timeStr}`;
}

/** ScheduleConfig → cron 表达式（与 cronToScheduleConfig 对称） */
export function scheduleToCron(config: ScheduleConfig): string {
    const [hourStr, minStr] = config.time.split(":");
    const hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    if (config.period === "daily") {
        return `${min} ${hour} * * *`;
    }
    if (config.period === "weekly") {
        const cronDow = (config.dayOfWeek ?? 1) % 7;
        return `${min} ${hour} * * ${cronDow}`;
    }
    return `${min} ${hour} ${config.dayOfMonth ?? 1} * *`;
}

/** cron 表达式 → ScheduleConfig（用于回填弹窗） */
export function cronToScheduleConfig(cron_expr: string): ScheduleConfig {
    const parts = cron_expr.trim().split(/\s+/);
    if (parts.length !== 5) return { period: "daily", time: "09:00" };
    const [minStr, hourStr, dom, , dow] = parts;
    const time = `${hourStr.padStart(2, "0")}:${minStr.padStart(2, "0")}`;

    if (dom !== "*") {
        return { period: "monthly", dayOfMonth: parseInt(dom, 10), time };
    }
    if (dow !== "*") {
        // cron dow: 0=Sun,1=Mon,...,6=Sat  → ISO: 1=Mon,...,7=Sun
        const cronDow = parseInt(dow, 10);
        const isoDow = cronDow === 0 ? 7 : cronDow;
        return { period: "weekly", dayOfWeek: isoDow, time };
    }
    return { period: "daily", time };
}

/** 简单 cron 表达式可视化 */
export function describeCron(expr: string): string {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return expr;
    const [min, hour, , , dow] = parts;

    const dowMap: Record<string, string> = {
        "0": "周日", "1": "周一", "2": "周二", "3": "周三",
        "4": "周四", "5": "周五", "6": "周六", "7": "周日",
        "*": "每天", "1-5": "工作日",
    };

    const dayStr = dowMap[dow] || `星期${dow}`;
    const timeStr = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
    return `${dayStr} ${timeStr}`;
}
