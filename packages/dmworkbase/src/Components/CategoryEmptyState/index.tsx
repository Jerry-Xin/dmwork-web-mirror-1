import React from "react"
import "./index.css"

export interface CategoryEmptyStateProps {
    onCreateCategory: () => void
}

const FolderIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
)

const PlusIcon = () => (
    <svg viewBox="0 0 24 24">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)

const CategoryEmptyState: React.FC<CategoryEmptyStateProps> = ({ onCreateCategory }) => {
    return (
        <div className="wk-category-empty-state">
            <div className="wk-category-empty-state__icon-wrap">
                <FolderIcon />
            </div>
            <p className="wk-category-empty-state__title">整理你的群聊</p>
            <p className="wk-category-empty-state__desc">
                创建分组，把群聊按工作、项目、生活分类，快速找到想看的对话。
            </p>
            <button className="wk-category-empty-state__primary-btn" onClick={onCreateCategory}>
                <PlusIcon />
                新建分组
            </button>
        </div>
    )
}

export default CategoryEmptyState
