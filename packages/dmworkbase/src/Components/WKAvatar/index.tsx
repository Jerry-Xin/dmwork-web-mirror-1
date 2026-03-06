import WKSDK, { Channel, ChannelTypePerson } from "wukongimjssdk";
import React from "react";
import { Component, CSSProperties } from "react";
import WKApp from "../../App";
import "./index.css"

/**
 * Check if a user is a bot by looking up channelInfo.
 * Centralizes the repeated WKSDK.shared().channelManager.getChannelInfo(...) pattern.
 */
export function isBot(uid: string): boolean {
    const info = WKSDK.shared().channelManager.getChannelInfo(new Channel(uid, ChannelTypePerson))
    return info?.orgData?.robot === 1
}

interface WKAvatarProps {
    channel?: Channel
    src?: string
    style?: CSSProperties
    random?: string
    showBotBadge?: boolean
}

const defaultAvatarSVG = `
  data:image/svg+xml;charset=UTF-8,<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
  <rect width="50" height="50" x="0" y="0" rx="20" ry="20" fill="rgb(220,220,220)" />
</svg>
`;

export interface WKAvatarState {
    src: string
    loadedErr: boolean // 图片是否加载错误
}

export default class WKAvatar extends Component<WKAvatarProps, WKAvatarState> {

    constructor(props: any) {
        super(props);
        this.state = {
            src: this.getImageSrc(),
            loadedErr: false,
        };
    }
    getImageSrc() {
        const { channel, src, random } = this.props
        let imgSrc = ""
        if (src && src.trim() !== "") {
            imgSrc = src
        } else {
            if (channel) {
                imgSrc = WKApp.shared.avatarChannel(channel)
            }
        }
        if (random && random !== "") {
            imgSrc = `${imgSrc}#${random}`
        }
        return imgSrc
    }
    handleImgError() {
        this.setState({ src: defaultAvatarSVG, loadedErr: true });
    };
    handleLoad() {
        if(!this.state.loadedErr) {
            this.setState({ src: this.getImageSrc() })
        }
        
    }
    render() {
        const { style, showBotBadge } = this.props
        const avatarImg = <img alt="" style={style} className="wk-avatar" src={this.state.src} onLoad={this.handleLoad.bind(this)} onError={this.handleImgError.bind(this)} />

        if (!showBotBadge) {
            return avatarImg
        }

        return (
            <div className="wk-avatar-wrapper" style={{ width: style?.width, height: style?.height }}>
                {avatarImg}
                <div className="wk-avatar-bot-badge">
                    <img src="./identity_icon/robot.png" alt="bot" className="wk-avatar-bot-badge-icon" />
                </div>
            </div>
        )
    }
}
