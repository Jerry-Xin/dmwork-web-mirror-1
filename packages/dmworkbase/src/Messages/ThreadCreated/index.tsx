import { MessageContent, Channel, ChannelTypePerson } from "wukongimjssdk"
import React from "react"
import { Toast } from "@douyinfe/semi-ui"
import { MessageCell } from "../MessageCell"
import WKApp from "../../App"
import { ChannelTypeCommunityTopic } from "../../Service/Const"
import WKAvatar from "../../Components/WKAvatar"
import { getTimeStringAutoShort2 } from "../../Utils/time"
import { parseThreadChannelId } from "../../Service/Thread"
import "./index.css"

interface LastMessage {
  from_uid: string
  from_name: string
  content: string
  timestamp: number
}

export class ThreadCreatedContent extends MessageContent {
  content!: string
  from_uid!: string
  from_name!: string
  short_id!: string
  channel_id!: string
  channel_type!: number
  thread_name!: string
  message_count?: number
  last_message?: LastMessage

  decodeJSON(contentObj: any) {
    this.content = contentObj["content"] || ""
    this.from_uid = contentObj["from_uid"] || ""
    this.from_name = contentObj["from_name"] || ""
    this.short_id = contentObj["short_id"] || ""
    this.channel_id = contentObj["channel_id"] || ""
    this.channel_type = contentObj["channel_type"] || ChannelTypeCommunityTopic
    this.thread_name = contentObj["thread_name"] || ""
    this.message_count = contentObj["message_count"]
    if (contentObj["last_message"]) {
      this.last_message = {
        from_uid: contentObj["last_message"]["from_uid"] || "",
        from_name: contentObj["last_message"]["from_name"] || "",
        content: contentObj["last_message"]["content"] || "",
        timestamp: contentObj["last_message"]["timestamp"] || 0,
      }
    }
  }

  get conversationDigest() {
    return `[子区] ${this.thread_name}`
  }
}

export class ThreadCreatedCell extends MessageCell {
  handleClick = async () => {
    const { message } = this.props
    const content = message.content as ThreadCreatedContent
    const threadInfo = parseThreadChannelId(content.channel_id)

    if (threadInfo) {
      try {
        // 先检查子区是否存在
        const resp = await WKApp.apiClient.get(
          `groups/${threadInfo.groupNo}/threads/${threadInfo.shortId}`
        )
        // status: 1=活跃, 2=归档, 3=删除
        if (resp.status === 2) {
          Toast.warning("该子区已归档")
          return
        }
        if (resp.status === 3) {
          Toast.warning("该子区已删除")
          return
        }
      } catch (err: any) {
        Toast.warning("该子区已删除或不存在")
        return
      }
    }

    const channel = new Channel(content.channel_id, content.channel_type)
    WKApp.endpoints.showConversation(channel)
  }

  render() {
    const { message } = this.props
    const content = message.content as ThreadCreatedContent
    const hasActivity = content.message_count && content.message_count > 0 && content.last_message
    const createTime = getTimeStringAutoShort2(message.timestamp * 1000, true)

    return (
      <div className="wk-thread-created" onClick={this.handleClick}>
        <div className="wk-thread-created-header">
          <span className="wk-thread-created-name"># {content.thread_name}</span>
          {content.message_count && content.message_count > 0 ? (
            <span className="wk-thread-created-count">{content.message_count}条消息</span>
          ) : null}
          <span className="wk-thread-created-arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </span>
        </div>
        {hasActivity && content.last_message ? (
          <div className="wk-thread-created-activity">
            <WKAvatar
              channel={new Channel(content.last_message.from_uid, ChannelTypePerson)}
              style={{ width: 20, height: 20, fontSize: 10 }}
            />
            <span className="wk-thread-created-activity-name">{content.last_message.from_name}</span>
            <span className="wk-thread-created-activity-content">{content.last_message.content}</span>
            <span className="wk-thread-created-activity-time">
              {getTimeStringAutoShort2(content.last_message.timestamp * 1000, true)}
            </span>
          </div>
        ) : (
          <div className="wk-thread-created-desc">
            {content.from_name} 创建了子区 · {createTime}
          </div>
        )}
      </div>
    )
  }
}
