import React from "react"
import ViewToggle, { ViewMode } from "../ViewToggle"
import CategorySection from "../CategorySection"
import CategoryEmptyState from "../CategoryEmptyState"
import { useCategoryCollapse } from "../../Hooks/useCategoryCollapse"
import "./index.css"

export interface CategoryData {
    id: string
    name: string
    groupCount?: number   // 分组内群聊总数，折叠时显示
    unreadCount?: number
    conversations: React.ReactNode
    isEmpty?: boolean     // 无群聊时为 true
}

export interface ConversationListWithCategoryProps {
    viewMode?: ViewMode
    onViewModeChange?: (mode: ViewMode) => void
    categories?: CategoryData[]
    isLoading?: boolean
    error?: string | null
    onRetry?: () => void
    allConversations?: React.ReactNode
    onCreateCategory?: () => void
    /** 无任何群聊时（无分组且未分组为空）→ 空状态显示「发起群聊」 */
    hasNoGroups?: boolean
    onStartGroup?: () => void
    onCategoryContextMenu?: (categoryId: string, e: React.MouseEvent) => void
    /** CategorySection 是否启用拖拽（useSortable + useDroppable） */
    categorySectionDraggable?: boolean
    activeCategoryId?: string | null       // 右键菜单打开时的高亮分组
    renamingCategoryId?: string | null     // 行内重命名中的分组
    onRenameConfirm?: (id: string, newName: string) => void
    onRenameCancel?: () => void
}

const ConversationListWithCategory: React.FC<ConversationListWithCategoryProps> = ({
    viewMode,
    onViewModeChange,
    categories = [],
    isLoading,
    error,
    onRetry,
    allConversations,
    onCreateCategory,
    hasNoGroups,
    onStartGroup,
    onCategoryContextMenu,
    activeCategoryId,
    renamingCategoryId,
    onRenameConfirm,
    onRenameCancel,
    categorySectionDraggable,
}) => {
    const categoryIds = categories.map(c => c.id)
    const { isCollapsed, toggle: toggleCollapse } = useCategoryCollapse(categoryIds)

    const renderGroupedBody = () => {
        if (isLoading) {
            return (
                <div className="wk-conv-with-category__loading">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="wk-conv-with-category__skeleton" />
                    ))}
                </div>
            )
        }

        if (error) {
            return (
                <div className="wk-conv-with-category__error">
                    <span className="wk-conv-with-category__error-text">加载失败，请检查网络</span>
                    {onRetry && (
                        <button className="wk-conv-with-category__retry" onClick={onRetry}>
                            点击重试
                        </button>
                    )}
                </div>
            )
        }

        // 无自定义分组时：有群聊则直接显示未分组区，完全无群聊才显示空状态
        if (categories.length === 0) {
            if (hasNoGroups) {
                return (
                    <CategoryEmptyState
                        onCreateCategory={onCreateCategory ?? (() => {})}
                        noGroups
                        onStartGroup={onStartGroup}
                    />
                )
            }
            // 有群聊但无自定义分组 → 直接显示未分组区，不走分组 UI
            return (
                <div className="wk-conv-with-category__body">
                    {ungroupedConversations}
                </div>
            )
        }

        return (
            <>
                {categories.map(cat => (
                    <CategorySection
                        key={cat.id}
                        category={{ ...cat, isEmpty: cat.isEmpty ?? cat.groupCount === 0 }}
                        isCollapsed={isCollapsed(cat.id)}
                        onToggle={() => toggleCollapse(cat.id)}
                        onContextMenu={onCategoryContextMenu ? (e) => onCategoryContextMenu(cat.id, e) : undefined}
                        isActive={activeCategoryId === cat.id}
                        isEditing={renamingCategoryId === cat.id}
                        onRenameConfirm={onRenameConfirm ? (newName) => onRenameConfirm(cat.id, newName) : undefined}
                        onRenameCancel={onRenameCancel}
                        draggable={categorySectionDraggable}
                    >
                        {cat.conversations}
                    </CategorySection>
                ))}
                {/* UngroupedSection 已废弃：默认分组现在由后端返回的 is_default category 负责渲染 */}
            </>
        )
    }

    return (
        <div className="wk-conv-with-category">
            <div className="wk-conv-with-category__body">
                {renderGroupedBody()}
            </div>


        </div>
    )
}

export default ConversationListWithCategory
