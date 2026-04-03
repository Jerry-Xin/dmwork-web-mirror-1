import React, { Component } from "react"
import { Button, Spin, Modal, Toast } from "@douyinfe/semi-ui"
import { Channel } from "wukongimjssdk"
import { Thread, ThreadStatus } from "../../Service/Thread"
import { ChannelTypeCommunityTopic } from "../../Service/Const"
import WKApp from "../../App"
import RouteContext from "../../Service/Context"
import { ThreadListVM, ThreadListState } from "./vm"
import { ThreadCreate } from "../ThreadCreate"
import "./index.css"

export interface ThreadListProps {
  channel: Channel
  context: RouteContext<any>
}

export class ThreadList extends Component<ThreadListProps, ThreadListState> {
  private vm: ThreadListVM

  constructor(props: ThreadListProps) {
    super(props)
    this.state = {
      loading: true,
      threads: [],
      error: null,
    }
    this.vm = new ThreadListVM(props.channel.channelID, (state) => {
      this.setState(state)
    })
  }

  componentDidMount() {
    this.vm.load()
  }

  handleThreadClick = (thread: Thread) => {
    const channel = new Channel(thread.channel_id, ChannelTypeCommunityTopic)
    WKApp.endpoints.showConversation(channel)
  }

  handleCreateThread = () => {
    const { channel, context } = this.props
    context.push(
      <ThreadCreate
        groupNo={channel.channelID}
        onSuccess={() => {
          context.pop()
          this.vm.load()
        }}
      />,
      { title: "新建子区" }
    )
  }

  handleArchive = (thread: Thread, e: React.MouseEvent) => {
    e.stopPropagation()
    Modal.confirm({
      title: "归档子区",
      content: `确定要归档子区 "${thread.name}" 吗？归档后将不再显示在列表中。`,
      onOk: async () => {
        try {
          await this.vm.archive(thread.short_id)
          Toast.success("已归档")
        } catch (err: any) {
          Toast.error(err.message)
        }
      },
    })
  }

  handleDelete = (thread: Thread, e: React.MouseEvent) => {
    e.stopPropagation()
    Modal.confirm({
      title: "删除子区",
      content: `确定要删除子区 "${thread.name}" 吗？此操作不可恢复。`,
      okType: "danger",
      onOk: async () => {
        try {
          await this.vm.delete(thread.short_id)
          Toast.success("已删除")
        } catch (err: any) {
          Toast.error(err.message)
        }
      },
    })
  }

  handleJoin = async (thread: Thread, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await this.vm.join(thread.short_id)
      Toast.success("已加入")
    } catch (err: any) {
      Toast.error(err.message)
    }
  }

  handleLeave = (thread: Thread, e: React.MouseEvent) => {
    e.stopPropagation()
    Modal.confirm({
      title: "离开子区",
      content: `确定要离开子区 "${thread.name}" 吗？`,
      onOk: async () => {
        try {
          await this.vm.leave(thread.short_id)
          Toast.success("已离开")
        } catch (err: any) {
          Toast.error(err.message)
        }
      },
    })
  }

  formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) {
      return "今天"
    } else if (days === 1) {
      return "昨天"
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString()
    }
  }

  render() {
    const { loading, threads, error } = this.state

    if (loading) {
      return (
        <div className="wk-thread-list">
          <div className="wk-thread-list-loading">
            <Spin size="large" />
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="wk-thread-list">
          <div className="wk-thread-list-empty">
            <span className="wk-thread-list-empty-text">{error}</span>
            <Button onClick={() => this.vm.load()}>重试</Button>
          </div>
        </div>
      )
    }

    const activeThreads = threads.filter((t) => t.status === ThreadStatus.Active)

    return (
      <div className="wk-thread-list">
        <div className="wk-thread-list-header">
          <span className="wk-thread-list-title">子区列表</span>
          <Button size="small" onClick={this.handleCreateThread}>
            新建子区
          </Button>
        </div>
        <div className="wk-thread-list-content">
          {activeThreads.length === 0 ? (
            <div className="wk-thread-list-empty">
              <span className="wk-thread-list-empty-text">暂无子区</span>
              <Button onClick={this.handleCreateThread}>创建第一个子区</Button>
            </div>
          ) : (
            activeThreads.map((thread) => (
              <div
                key={thread.short_id}
                className="wk-thread-item"
                onClick={() => this.handleThreadClick(thread)}
              >
                <div className="wk-thread-item-icon">#</div>
                <div className="wk-thread-item-content">
                  <div className="wk-thread-item-name">
                    {thread.name}
                    {thread.is_member && (
                      <span className="wk-thread-item-badge">已加入</span>
                    )}
                  </div>
                  <div className="wk-thread-item-meta">
                    {thread.member_count !== undefined && thread.member_count > 0 && (
                      <span>{thread.member_count} 人 · </span>
                    )}
                    创建于 {this.formatTime(thread.created_at)}
                  </div>
                </div>
                <div className="wk-thread-item-actions">
                  {thread.is_member ? (
                    <Button
                      size="small"
                      type="tertiary"
                      onClick={(e) => this.handleLeave(thread, e)}
                    >
                      离开
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      type="primary"
                      onClick={(e) => this.handleJoin(thread, e)}
                    >
                      加入
                    </Button>
                  )}
                  <Button
                    size="small"
                    type="tertiary"
                    className="wk-thread-item-action-btn"
                    onClick={(e) => this.handleArchive(thread, e)}
                  >
                    归档
                  </Button>
                  <Button
                    size="small"
                    type="danger"
                    className="wk-thread-item-action-btn"
                    onClick={(e) => this.handleDelete(thread, e)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }
}

export default ThreadList
