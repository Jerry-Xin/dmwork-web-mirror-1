import React from "react"
import "./index.css"

export interface UngroupedSectionProps {
    children?: React.ReactNode
}

/**
 * 「未分组」区块。
 * 当 children 为空时，外部不应渲染此组件（由父组件判断是否显示）。
 */
const UngroupedSection: React.FC<UngroupedSectionProps> = ({ children }) => {
    return (
        <div className="wk-ungrouped-section">
            <div className="wk-ungrouped-section__header">
                <span className="wk-ungrouped-section__title">未分组</span>
            </div>
            <div>{children}</div>
        </div>
    )
}

export default UngroupedSection
