import React from "react"
import "./index.css"

export interface AddCategoryButtonProps {
    onClick: () => void
}

const AddCategoryButton: React.FC<AddCategoryButtonProps> = ({ onClick }) => {
    return (
        <button className="wk-add-category-btn" onClick={onClick}>
            <span>+</span>
            <span>新建分组</span>
        </button>
    )
}

export default AddCategoryButton
