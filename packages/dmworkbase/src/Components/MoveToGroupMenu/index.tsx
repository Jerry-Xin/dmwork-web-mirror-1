import React from "react"
import "./index.css"

export interface Category {
    id: string
    name: string
}

export interface MoveToGroupMenuProps {
    categories: Category[]
    onSelect: (categoryId: string) => void
    onCreateNew: () => void
}

const MoveToGroupMenu: React.FC<MoveToGroupMenuProps> = ({
    categories,
    onSelect,
    onCreateNew,
}) => {
    return (
        <div className="wk-move-to-group-menu">
            {categories.map((cat) => (
                <div
                    key={cat.id}
                    className="wk-move-to-group-menu__item"
                    onClick={() => onSelect(cat.id)}
                >
                    {cat.name}
                </div>
            ))}
            {categories.length > 0 && <div className="wk-move-to-group-menu__divider" />}
            <div
                className="wk-move-to-group-menu__item wk-move-to-group-menu__create"
                onClick={onCreateNew}
            >
                + 新建分组
            </div>
        </div>
    )
}

export default MoveToGroupMenu
