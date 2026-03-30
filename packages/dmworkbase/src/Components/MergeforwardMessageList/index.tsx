import { Channel, ChannelTypeGroup, ChannelTypePerson, WKSDK, Message, MessageContentType } from "wukongimjssdk";
import React from "react";
import { Component, ReactNode } from "react";
import { ImageContent } from "../../Messages/Image";
import { FileContent } from "../../Messages/File/FileContent";
import { MessageContentTypeConst } from "../../Service/Const";
import MergeforwardContent from "../../Messages/Mergeforward";
import { dateFormat, getTimeStringAutoShort2 } from "../../Utils/time";
import WKAvatar, { isBot } from "../WKAvatar";
import AiBadge from "../AiBadge";
import WKViewQueueHeader from "../WKViewQueueHeader";
import WKApp from "../../App";

import "./index.css"


export interface MergeforwardMessageListProps {
    mergeforwardContent: MergeforwardContent
}

export default class MergeforwardMessageList extends Component<MergeforwardMessageListProps> {

    getTitle(content: MergeforwardContent) {
        if (content.channelType === ChannelTypeGroup) {
            return "群的聊天记录"
        }

        const names = content.users.map((v) => {
            return v.name
        })

        return `${names.join("、")}的聊天记录`

    }

    getTimeline(content: MergeforwardContent) {
        if (!content.msgs || content.msgs.length === 0) {
            return ""
        }
        if (content.msgs.length === 1) {
            const msg = content.msgs[0]
            return dateFormat(new Date(msg.timestamp * 1000), "yyyy-MM-dd")
        }
        const firstMsg = content.msgs[0]
        const lastMsg = content.msgs[content.msgs.length - 1]

        return `${dateFormat(new Date(firstMsg.timestamp * 1000), "yyyy-MM-dd")} ~ ${dateFormat(new Date(lastMsg.timestamp * 1000), "yyyy-MM-dd")}`
    }

    imageScale(orgWidth: number, orgHeight: number, maxWidth = 250, maxHeight = 250) {
        let actSize = { width: orgWidth, height: orgHeight };
        if (orgWidth > orgHeight) {//横图
            if (orgWidth > maxWidth) { // 横图超过最大宽度
                let rate = maxWidth / orgWidth; // 缩放比例
                actSize.width = maxWidth;
                actSize.height = orgHeight * rate;
            }
        } else if (orgWidth < orgHeight) { //竖图
            if (orgHeight > maxHeight) {
                let rate = maxHeight / orgHeight; // 缩放比例
                actSize.width = orgWidth * rate;
                actSize.height = maxHeight;
            }
        } else if (orgWidth === orgHeight) {
            if (orgWidth > maxWidth) {
                let rate = maxWidth / orgWidth; // 缩放比例
                actSize.width = maxWidth;
                actSize.height = orgHeight * rate;
            }
        }
        return actSize;
    }
    getImageSrc(content:ImageContent) {
        if (content.url && content.url !== "") { // 等待发送的消息
            return WKApp.dataSource.commonDataSource.getImageURL(content.url, { width: content.width, height: content.height })
        }
        return content.imgData
    }

    getFileURL(content: FileContent): string {
        if (content.url && content.url !== "") {
            const fileUrl = WKApp.dataSource.commonDataSource.getFileURL(content.url)
            if (fileUrl && !fileUrl.startsWith("http")) {
                return window.location.origin + "/" + fileUrl.replace(/^\//, "")
            }
            return fileUrl
        }
        return ""
    }

    getFileExtColor(extension: string): string {
        const ext = (extension || "").toLowerCase()
        switch (ext) {
            case "pdf": return "#EF4444"
            case "doc": case "docx": return "#3B82F6"
            case "xls": case "xlsx": return "#22C55E"
            case "ppt": case "pptx": return "#F97316"
            case "zip": case "rar": case "7z": return "#EAB308"
            default: return "#9CA3AF"
        }
    }

    formatFileSize(bytes: number): string {
        if (bytes <= 0) return "0 B"
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }

    getMsgContent(msg:Message) {
        if(msg.contentType === MessageContentType.image) {
           const imageContent = msg.content as ImageContent
           const size = this.imageScale(imageContent.width,imageContent.height)

           return <img style={{"width":`${size.width}px`,"height":`${size.height}px`,borderRadius:"4px"}} src={this.getImageSrc(imageContent)}>
           </img>
        }
        if (msg.contentType === MessageContentTypeConst.file) {
            const fileContent = msg.content as FileContent
            const url = this.getFileURL(fileContent)
            const ext = (fileContent.extension || "").toUpperCase()
            const color = this.getFileExtColor(fileContent.extension)
            return (
                <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: "#f5f5f5", borderRadius: "6px", gap: "10px", maxWidth: "300px", cursor: url ? "pointer" : "default" }}
                     onClick={() => {
                         if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"))) {
                             const a = document.createElement("a")
                             a.href = url
                             a.download = fileContent.name || "file"
                             a.target = "_blank"
                             document.body.appendChild(a)
                             a.click()
                             document.body.removeChild(a)
                         }
                     }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "6px", backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: "#fff", fontSize: "11px", fontWeight: 600 }}>{ext || "FILE"}</span>
                    </div>
                    <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: "13px", color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={fileContent.name}>
                            {fileContent.name || "unknown file"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#999" }}>
                            {this.formatFileSize(fileContent.size)}
                        </div>
                    </div>
                </div>
            )
        }
        return msg.content.conversationDigest
    }

    render(): ReactNode {
        const { mergeforwardContent } = this.props
        return <div className="wk-mergeforwardmessagelist">
            <div className="wk-mergeforwardmessagelist-header">
                <WKViewQueueHeader hideBack={true} title={this.getTitle(mergeforwardContent)}></WKViewQueueHeader>
            </div>
            <div className="wk-mergeforwardmessagelist-content">
                <div className="wk-mergeforwardmessagelist-content-timeline">
                    {this.getTimeline(mergeforwardContent)}
                </div>
                <div className="wk-mergeforwardmessagelist-content-msgs">
                    {
                        mergeforwardContent.msgs.map((m,i) => {
                            const fromChannel = new Channel(m.fromUID, ChannelTypePerson)
                            let fromChannelInfo = WKSDK.shared().channelManager.getChannelInfo(fromChannel)
                            if(!fromChannelInfo) {
                                WKSDK.shared().channelManager.fetchChannelInfo(fromChannel)
                            }
                            let showAvatar = true
                            if(i > 0) {
                                showAvatar = mergeforwardContent.msgs[i-1].fromUID !== m.fromUID
                            }
                            return <div className="wk-mergeforwardmessagelist-content-msg" key={m.messageID}>
                                <div className="wk-mergeforwardmessagelist-content-msg-avatar" style={{ "width": "40px", "height": "40px", "borderRadius": "50%" }}>
                                    {
                                        showAvatar?<WKAvatar channel={new Channel(m.fromUID, ChannelTypePerson)} style={{ "width": "40px", "height": "40px", "borderRadius": "50%" }}></WKAvatar>:undefined
                                    }
                                </div>
                                <div className="wk-mergeforwardmessagelist-content-msg-info">
                                    <div className="wk-mergeforwardmessagelist-content-msg-info-first">
                                        <div className="wk-mergeforwardmessagelist-content-msg-info-first-name">
                                            {fromChannelInfo?.title}
                                            {isBot(m.fromUID) && <AiBadge size="small" />}
                                        </div>
                                        <div className="wk-mergeforwardmessagelist-content-msg-info-first-time">
                                                {getTimeStringAutoShort2(m.timestamp*1000,true)}
                                        </div>
                                    </div>
                                    <div className="wk-mergeforwardmessagelist-content-msg-info-second">
                                           <div className="wk-mergeforwardmessagelist-content-msg-info-second-msgcontent">
                                           {
                                               this.getMsgContent(m)
                                            }
                                           </div>
                                    </div>
                                </div>
                            </div>
                        })
                    }

                </div>
            </div>
        </div>
    }
}