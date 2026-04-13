import React from "react"
import "./index.css"

export type ViewMode = "all" | "grouped"

export interface ViewToggleProps {
    value: ViewMode
    onChange: (value: ViewMode) => void
}

const ViewToggle: React.FC<ViewToggleProps> = ({ value, onChange }) => {
    return (
        <div className="wk-view-toggle">
            <button
                className={`wk-view-toggle-item${value === "all" ? " wk-view-toggle-item--active" : ""}`}
                onClick={() => onChange("all")}
            >
                全部
            </button>
            <button
                className={`wk-view-toggle-item${value === "grouped" ? " wk-view-toggle-item--active" : ""}`}
                onClick={() => onChange("grouped")}
            >
                分组
            </button>
        </div>
    )
}

export default ViewToggle
