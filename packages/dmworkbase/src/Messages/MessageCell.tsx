import React, { Component } from "react";
import WKSDK, { Channel, ChannelInfo, ChannelInfoListener, ChannelTypePerson } from "wukongimjssdk";
import ConversationContext from "../Components/Conversation/context";
import { MessageWrap } from "../Service/Model";


export interface MessageBaseCellProps {
    message: MessageWrap
    context: ConversationContext
}

class MessageBaseCellPropsImp implements MessageBaseCellProps {
    message!: MessageWrap;
    context!: ConversationContext

}
export class MessageBaseCell<P extends MessageBaseCellProps = MessageBaseCellPropsImp, S = {}> extends Component<P, S> {


}

export class MessageCell<P extends MessageBaseCellProps = MessageBaseCellPropsImp, S = {}> extends MessageBaseCell<P, S> {
    private _channelInfoListener!: ChannelInfoListener

    componentDidMount() {
        const { message } = this.props
        // 订阅 channelInfo 更新，发送者信息到达后触发重渲染（修复 uid 显示问题）
        this._channelInfoListener = (channelInfo: ChannelInfo) => {
            if (channelInfo?.channel?.channelID === message.fromUID) {
                this.setState({})
            }
        }
        WKSDK.shared().channelManager.addListener(this._channelInfoListener)

        // 没有缓存时主动拉取
        if (message.fromUID) {
            const channel = new Channel(message.fromUID, ChannelTypePerson)
            if (!WKSDK.shared().channelManager.getChannelInfo(channel)) {
                WKSDK.shared().channelManager.fetchChannelInfo(channel)
            }
        }
    }

    componentWillUnmount() {
        WKSDK.shared().channelManager.removeListener(this._channelInfoListener)
    }

    render() {
        return <div>MessageCell</div>
    }
}
