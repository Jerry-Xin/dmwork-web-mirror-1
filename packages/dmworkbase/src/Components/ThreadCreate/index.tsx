import React, { Component } from "react"
import { Input, Button, Toast } from "@douyinfe/semi-ui"
import WKApp from "../../App"
import "./index.css"

export interface ThreadCreateProps {
  groupNo: string
  sourceMessageId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

interface ThreadCreateState {
  name: string
  loading: boolean
}

export class ThreadCreate extends Component<ThreadCreateProps, ThreadCreateState> {
  constructor(props: ThreadCreateProps) {
    super(props)
    this.state = {
      name: "",
      loading: false,
    }
  }

  handleNameChange = (value: string) => {
    this.setState({ name: value })
  }

  handleSubmit = async () => {
    const { groupNo, sourceMessageId, onSuccess } = this.props
    const { name } = this.state

    if (!name.trim()) {
      Toast.warning("请输入子区名称")
      return
    }

    if (name.length > 50) {
      Toast.warning("子区名称不能超过50个字符")
      return
    }

    this.setState({ loading: true })

    try {
      await WKApp.dataSource.channelDataSource.threadCreate(
        groupNo,
        name.trim(),
        sourceMessageId
      )
      Toast.success("创建成功")
      onSuccess?.()
    } catch (err: any) {
      Toast.error(err?.msg || "创建失败")
      this.setState({ loading: false })
    }
  }

  render() {
    const { onCancel } = this.props
    const { name, loading } = this.state

    return (
      <div className="wk-thread-create">
        <div className="wk-thread-create-form">
          <div className="wk-thread-create-field">
            <label className="wk-thread-create-label">子区名称</label>
            <Input
              className="wk-thread-create-input"
              placeholder="请输入子区名称"
              value={name}
              onChange={this.handleNameChange}
              maxLength={50}
              showClear
            />
            <span className="wk-thread-create-hint">
              子区是群内独立的讨论话题，最多50个字符
            </span>
          </div>
        </div>
        <div className="wk-thread-create-actions">
          {onCancel && (
            <Button onClick={onCancel} disabled={loading}>
              取消
            </Button>
          )}
          <Button
            type="primary"
            onClick={this.handleSubmit}
            loading={loading}
            disabled={!name.trim()}
          >
            创建
          </Button>
        </div>
      </div>
    )
  }
}

export default ThreadCreate
