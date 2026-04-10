import React from "react"
import "./index.css"

export interface CategoryHeaderProps {
    name: string
    unreadCount?: number
    isCollapsed: boolean
    isEmpty?: boolean
    onToggle: () => void
    onContextMenu?: (e: React.MouseEvent) => void
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
    name,
    unreadCount,
    isCollapsed,
    isEmpty,
    onToggle,
    onContextMenu,
}) => {
    return (
        <div
            className={`wk-category-header${isEmpty ? " wk-category-header--empty" : ""}`}
            onClick={onToggle}
            onContextMenu={onContextMenu}
        >
            <span
                className={`wk-category-header__arrow ${
                    isCollapsed ? "wk-category-header__arrow--collapsed" : "wk-category-header__arrow--expanded"
                }`}
            >
                ▼
            </span>
            <span className="wk-category-header__name">{name}</span>
            {!!unreadCount && unreadCount > 0 && (
                <span className="wk-category-header__badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
            {onContextMenu && (
                <span
                    className="wk-category-header__more"
                    onClick={(e) => {
                        e.stopPropagation()
                        onContextMenu(e)
                    }}
                >
                    ···
                </span>
            )}
        </div>
    )
}

export default CategoryHeader
