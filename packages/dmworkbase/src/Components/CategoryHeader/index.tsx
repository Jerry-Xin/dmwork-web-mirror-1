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
            {/* 折叠箭头 */}
            <span className={`wk-category-header__arrow${isCollapsed ? " wk-category-header__arrow--collapsed" : ""}`}>
                <svg viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </span>

            {/* 分组名 */}
            <span className="wk-category-header__name">{name}</span>

            {/* 未读 badge（有未读时显示） */}
            {!!unreadCount && unreadCount > 0 && (
                <span className="wk-category-header__badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </div>
    )
}

export default CategoryHeader
