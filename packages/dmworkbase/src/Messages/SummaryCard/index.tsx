import React from "react";
import MessageBase from "../Base";
import MessageTrail from "../Base/tail";
import { MessageBaseCellProps, MessageCell } from "../MessageCell";
import { SummaryCardContent } from "./SummaryCardContent";
import WKApp from "../../App";
import "./index.css";

function formatShortDate(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

export class SummaryCardCell extends MessageCell<MessageBaseCellProps> {
    render() {
        const { message, context } = this.props;
        const content = message.content as SummaryCardContent;

        const sourceLabel =
            content.summaryMode === 2
                ? `${content.sourceCount}位成员`
                : `${content.sourceCount}个群聊`;

        return (
            <MessageBase hiddeBubble={true} message={message} context={context}>
                <div className="wk-message-summary-card">
                    <div className="wk-message-summary-card-body">
                        <div className="wk-message-summary-card-header">
                            <span>📊</span>
                            <span>智能总结</span>
                        </div>
                        <div className="wk-message-summary-card-title">
                            {content.title}
                        </div>
                        <div className="wk-message-summary-card-meta">
                            来源：{sourceLabel} | {content.totalMsgCount}条消息
                        </div>
                        <div className="wk-message-summary-card-meta">
                            时间：{formatShortDate(content.timeRangeStart)} - {formatShortDate(content.timeRangeEnd)}
                        </div>
                        <div className="wk-message-summary-card-action">
                            <span
                                className="wk-message-summary-card-action-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    WKApp.openSummaryDetail?.(content.taskId);
                                }}
                            >
                                查看完整总结
                            </span>
                        </div>
                    </div>
                    <div className="wk-message-summary-card-bottom">
                        <div className="wk-message-summary-card-bottom-flag">智能总结</div>
                        <div className="wk-message-summary-card-bottom-time">
                            <MessageTrail message={message} timeStyle={{ color: "#999" }} />
                        </div>
                    </div>
                </div>
            </MessageBase>
        );
    }
}

export default SummaryCardCell;
