import React from "react"
import AddCategoryButton from "../AddCategoryButton"
import "./index.css"

export interface CategoryEmptyStateProps {
    onCreateCategory: () => void
}

const CategoryEmptyState: React.FC<CategoryEmptyStateProps> = ({ onCreateCategory }) => {
    return (
        <div className="wk-category-empty-state">
            <div className="wk-category-empty-state__icon">📁</div>
            <p className="wk-category-empty-state__title">整理你的群聊</p>
            <p className="wk-category-empty-state__desc">一目了然</p>
            <div className="wk-category-empty-state__btn-wrap">
                <AddCategoryButton onClick={onCreateCategory} />
            </div>
        </div>
    )
}

export default CategoryEmptyState
