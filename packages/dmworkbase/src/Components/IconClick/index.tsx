import React from "react";
import { Component, ReactNode } from "react";
import "./index.css"

export interface IconClickProps {
    icon:string | React.ReactNode
    onClick?:()=>void
}

export default class IconClick extends Component<IconClickProps> {
    render(): ReactNode {
        const { icon,onClick } = this.props
        return <div className="wk-iconclick" onClick={()=>{
            if(onClick) {
                onClick()
            }
        }}>
            {typeof icon === 'string' ? <img src={icon}></img> : icon}
        </div>
    }
}