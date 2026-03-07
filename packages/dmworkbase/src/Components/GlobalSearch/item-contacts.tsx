import React from "react";
import { Component, ReactNode } from "react";
import WKAvatar from "../WKAvatar";
import AiBadge from "../AiBadge";
import "./item-contacts.css"
import { sanitizeHighlight } from "./sanitize"
interface ItemContactsProps {
    avatar: string;
    name: string;
    isBot?: boolean;
    onClick?: () => void;
}

export default class ItemContacts extends Component<ItemContactsProps> {

     render(): ReactNode {
            return <div className="wk-item-contacts" onClick={()=>{
                if(this.props.onClick){
                    this.props.onClick()
                }
            }}>
                <WKAvatar src={this.props.avatar} style={{width:"40px",height:"40px"}}></WKAvatar>
                <div className="wk-item-contacts-name">
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHighlight(this.props.name) }}></span>
                    {this.props.isBot && <AiBadge />}
                </div>
            </div>
        }
}
