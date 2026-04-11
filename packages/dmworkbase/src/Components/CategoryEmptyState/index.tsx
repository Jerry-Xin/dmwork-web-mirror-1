import React from "react"
import "./index.css"

export interface CategoryEmptyStateProps {
    onCreateCategory: () => void
}

// 线性扁平文件夹图标（SVG），与设计稿风格一致
const FolderIcon = () => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M8 16C8 13.79 9.79 12 12 12H22L26 16H44C46.21 16 48 17.79 48 20V40C48 42.21 46.21 44 44 44H12C9.79 44 8 42.21 8 40V16Z"
            stroke="var(--wk-brand-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        <path
            d="M8 24H48"
            stroke="var(--wk-brand-primary)"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
)

const CategoryEmptyState: React.FC<CategoryEmptyStateProps> = ({ onCreateCategory }) => {
    return (
        <div className="wk-category-empty-state">
            <FolderIcon />
            <p className="wk-category-empty-state__title">整理你的群聊</p>
            <p className="wk-category-empty-state__desc">一目了然</p>
            <button className="wk-category-empty-state__primary-btn" onClick={onCreateCategory}>
                + 新建分组
            </button>
        </div>
    )
}

export default CategoryEmptyState
