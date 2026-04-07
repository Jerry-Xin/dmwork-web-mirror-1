import React from "react"
import { Component, ReactNode } from "react"
import ConversationContext from "../Conversation/context"
import { Toast } from "@douyinfe/semi-ui"

import "./index.css"

interface FileToolbarProps {
    conversationContext: ConversationContext
    icon: string | React.ReactNode
}

export default class FileToolbar extends Component<FileToolbarProps> {
    $fileInput: any

    onFileClick = (event: any) => {
        event.target.value = ""
    }

    onFileChange = () => {
        const { conversationContext } = this.props
        const files = Array.from(this.$fileInput.files as FileList)
        if (!files || files.length === 0) return

        // 同名文件轻量提示
        const currentNames = new Set(conversationContext.getPendingAttachments().map(f => f.name))
        const hasDuplicate = files.some(f => currentNames.has(f.name))
        if (hasDuplicate) {
            Toast.warning("包含同名文件，已追加到待发送列表")
        }

        const err = conversationContext.addPendingAttachments(files)
        if (err) {
            Toast.error(err)
        }
    }

    chooseFile = () => {
        this.$fileInput.click()
    }

    // 供拖拽入队使用（被 Conversation 的 onDrop 调用）
    addFiles = (files: File[]) => {
        const { conversationContext } = this.props
        const err = conversationContext.addPendingAttachments(files)
        if (err) {
            Toast.error(err)
        }
    }

    render(): ReactNode {
        const { icon } = this.props

        return (
            <div className="wk-filetoolbar">
                <div className="wk-filetoolbar-content" onClick={this.chooseFile}>
                    <div className="wk-filetoolbar-content-icon">
                        {typeof icon === 'string' ? <img src={icon} alt="" /> : icon}
                        <input
                            onClick={this.onFileClick}
                            onChange={this.onFileChange}
                            ref={(ref) => { this.$fileInput = ref }}
                            type="file"
                            multiple={true}
                            style={{ display: "none" }}
                        />
                    </div>
                </div>
            </div>
        )
    }
}
