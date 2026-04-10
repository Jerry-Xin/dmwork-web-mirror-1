import React, { useState } from "react"
import { ChannelTypeGroup } from "wukongimjssdk"
import { useCategoryList } from "../../Hooks/useCategoryList"
import { ConversationWrap } from "../../Service/Model"
import ConversationList from "../ConversationList"
import ConversationListWithCategory from "../ConversationListWithCategory"
import CreateCategoryModal from "../CreateCategoryModal"
import CategoryManagePanel from "../CategoryManagePanel"
import { ContextMenusData } from "../ContextMenus"
import { Channel } from "wukongimjssdk"
import WKApp from "../../App"

export interface ConversationListGroupedProps {
    conversations: ConversationWrap[]
    select?: Channel
    onConversationClick: (conv: ConversationWrap) => void
    onClearMessages: (channel: Channel) => void
    onThreadOverflowClick: (groupNo: string) => void
}

type ViewMode = "all" | "grouped"

const VIEW_MODE_KEY = "wk_category_view_mode"

function getStoredViewMode(): ViewMode {
    try {
        const v = localStorage.getItem(VIEW_MODE_KEY)
        if (v === "all" || v === "grouped") return v
    } catch {}
    return "all"
}

/**
 * ConversationListGrouped
 * 在「群聊」Tab 下替换原 ConversationList，提供「全部 | 分组」两态切换。
 * 在其他 Tab 下透传给原 ConversationList（不需要分组功能）。
 */
const ConversationListGrouped: React.FC<ConversationListGroupedProps> = ({
    conversations,
    select,
    onConversationClick,
    onClearMessages,
    onThreadOverflowClick,
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode)
    const [createModalVisible, setCreateModalVisible] = useState(false)
    const [managePanelVisible, setManagePanelVisible] = useState(false)

    const {
        categories,
        isLoading,
        error,
        reload,
        createCategory,
        renameCategory,
        deleteCategory,
        sortCategories,
        moveGroupToCategory,
    } = useCategoryList()

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode)
        try { localStorage.setItem(VIEW_MODE_KEY, mode) } catch {}
    }

    // 按分组组织会话列表
    const groupConversations = conversations.filter(
        c => c.channel.channelType === ChannelTypeGroup
    )

    // 构建每个分组的会话渲染
    const categoriesWithConvs = categories.map(cat => {
        const catGroupNos = new Set((cat.groups || []).map(g => g.group_no))
        const catConvs = groupConversations.filter(c => catGroupNos.has(c.channel.channelID))
        return {
            id: cat.category_id!,
            name: cat.name,
            conversations: (
                <ConversationList
                    conversations={catConvs}
                    select={select}
                    filter="group"
                    onClick={onConversationClick}
                    onClearMessages={onClearMessages}
                    onThreadOverflowClick={onThreadOverflowClick}
                />
            ),
        }
    })

    // 未分组的群聊
    const categorizedGroupNos = new Set(
        categories.flatMap(cat => (cat.groups || []).map(g => g.group_no))
    )
    const ungroupedConvs = groupConversations.filter(
        c => !categorizedGroupNos.has(c.channel.channelID)
    )

    const existingCategoryNames = categories.map(c => c.name)

    // 右键菜单：只有群聊才加「移到分组」
    const buildExtraContextMenus = (conv: ConversationWrap | undefined): ContextMenusData[] => {
        if (!conv || conv.channel.channelType !== ChannelTypeGroup) return []
        return categories.map(cat => ({
            title: `移到「${cat.name}」`,
            onClick: () => {
                moveGroupToCategory(conv.channel.channelID, cat.category_id!)
            },
        }))
    }

    const ConvListWithMenu = (convs: ConversationWrap[]) => (
        <ConversationList
            conversations={convs}
            select={select}
            filter="group"
            onClick={onConversationClick}
            onClearMessages={onClearMessages}
            onThreadOverflowClick={onThreadOverflowClick}
            extraContextMenus={buildExtraContextMenus}
        />
    )

    return (
        <>
            <ConversationListWithCategory
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                categories={categoriesWithConvs.map(cat => ({
                    ...cat,
                    conversations: ConvListWithMenu(
                        groupConversations.filter(c =>
                            categories.find(cc => cc.category_id === cat.id)
                                ?.groups?.some(g => g.group_no === c.channel.channelID)
                        )
                    ),
                }))}
                isLoading={isLoading}
                error={error}
                onRetry={reload}
                allConversations={ConvListWithMenu(conversations)}
                onCreateCategory={() => setCreateModalVisible(true)}
                onManageCategories={() => setManagePanelVisible(true)}
            />

            <CreateCategoryModal
                visible={createModalVisible}
                existingNames={existingCategoryNames}
                onConfirm={async (name) => {
                    await createCategory(name)
                    setCreateModalVisible(false)
                }}
                onCancel={() => setCreateModalVisible(false)}
            />

            <CategoryManagePanel
                visible={managePanelVisible}
                categories={categories
                    .filter(c => c.category_id !== null)
                    .map(c => ({
                        id: c.category_id!,
                        name: c.name,
                        groupCount: (c.groups || []).length,
                    }))
                }
                onClose={() => setManagePanelVisible(false)}
                onRename={renameCategory}
                onDelete={deleteCategory}
                onReorder={sortCategories}
            />
        </>
    )
}

export default ConversationListGrouped
