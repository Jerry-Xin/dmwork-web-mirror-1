import React from "react"
import ConnectionStatus from "../ConnectionStatus"

/**
 * NavSignalBadge — NavRail 信号格薄包装，复用 ConnectionStatus compact 模式。
 * 直接用 <ConnectionStatus compact /> 效果等同。
 */
export default function NavSignalBadge() {
    return <ConnectionStatus compact />
}
