import React, { useState, useRef, useEffect } from "react"
import { ChannelTypeGroup } from "wukongimjssdk"
import { useCategoryList } from "../../Hooks/useCategoryList"
import { ConversationWrap } from "../../Service/Model"
import ConversationList from "../ConversationList"
import ConversationListWithCategory from "../ConversationListWithCategory"
import CreateCategoryModal from "../CreateCategoryModal"
import CategoryManagePanel from "../CategoryManagePanel"
import ContextMenus, { ContextMenusContext, ContextMenusData } from "../ContextMenus"
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
    const categoryCtxMenuRef = useRef<ContextMenusContext | null>(null)
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

    // 监听来自其他 filter 下右键菜单「新建分组」的事件
    useEffect(() => {
        const handler = () => setCreateModalVisible(true)
        window.addEventListener("wk:open-create-category", handler)
        return () => window.removeEventListener("wk:open-create-category", handler)
    }, [])

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

    // 只过滤群聊
    const groupConversations = conversations.filter(
        c => c.channel.channelType === ChannelTypeGroup
    )

    // 预建 groupNo → ConversationWrap 的 Map，避免重复遍历
    const groupConvMap = new Map(groupConversations.map(c => [c.channel.channelID, c]))

    // 未分组的 groupNo 集合
    const categorizedGroupNos = new Set(
        categories.flatMap(cat => (cat.groups || []).map(g => g.group_no))
    )
    const ungroupedConvs = groupConversations.filter(
        c => !categorizedGroupNos.has(c.channel.channelID)
    )

    const existingCategoryNames = categories.map(c => c.name)

    // 右键菜单：只有群聊才加「移到分组」子菜单（含当前分组 ✓ 标识 + 新建分组入口）
    const buildExtraContextMenus = (conv: ConversationWrap | undefined): ContextMenusData[] => {
        if (!conv || conv.channel.channelType !== ChannelTypeGroup) return []
        if (categories.length === 0) return []

        const groupNo = conv.channel.channelID
        const currentCategoryId = categories.find(
            cat => (cat.groups || []).some(g => g.group_no === groupNo)
        )?.category_id

        const items: ContextMenusData[] = categories.map(cat => ({
            title: currentCategoryId === cat.category_id ? `✓ ${cat.name}` : cat.name,
            onClick: () => moveGroupToCategory(groupNo, cat.category_id!),
        }))

        items.push({ separator: true } as any)
        items.push({
            title: "+ 新建分组",
            onClick: () => setCreateModalVisible(true),
        })

        return items
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

    // 一次性构建分组数据（含会话渲染），无重复计算
    const categoriesForView = categories.map(cat => {
        const catConvs = (cat.groups || [])
            .map(g => groupConvMap.get(g.group_no))
            .filter((c): c is ConversationWrap => c !== undefined)
        return {
            id: cat.category_id!,
            name: cat.name,
            conversations: ConvListWithMenu(catConvs),
        }
    })

    // 分组标题右键菜单（重命名/上移/下移/删除）
    const buildCategoryContextMenus = (categoryId: string): ContextMenusData[] => {
        const idx = categories.findIndex(c => c.category_id === categoryId)
        const cat = categories[idx]
        if (!cat) return []
        return [
            {
                title: "重命名",
                icon: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z m-2-2 4 4",
                onClick: () => setManagePanelVisible(true),
            },
            {
                title: "上移",
                icon: "M18 15 12 9 6 15",
                onClick: () => {
                    if (idx <= 0) return
                    const newIds = categories.map(c => c.category_id!)
                    ;[newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]]
                    sortCategories(newIds)
                },
            },
            {
                title: "下移",
                icon: "M6 9l6 6 6-6",
                onClick: () => {
                    if (idx >= categories.length - 1) return
                    const newIds = categories.map(c => c.category_id!)
                    ;[newIds[idx], newIds[idx + 1]] = [newIds[idx + 1], newIds[idx]]
                    sortCategories(newIds)
                },
            },
            { separator: true } as any,
            {
                title: "删除分组",
                icon: "M3 6h18 M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6 M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",
                danger: true,
                onClick: () => deleteCategory(categoryId),
            },
        ]
    }

    return (
        <>
            <ConversationListWithCategory
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                categories={categoriesForView}
                isLoading={isLoading}
                error={error}
                onRetry={reload}
                allConversations={ConvListWithMenu(conversations)}
                ungroupedConversations={ungroupedConvs.length > 0 ? ConvListWithMenu(ungroupedConvs) : undefined}
                onCreateCategory={() => setCreateModalVisible(true)}
                onManageCategories={() => setManagePanelVisible(true)}
                onCategoryContextMenu={(categoryId, e) => {
                    setActiveCategoryId(categoryId)
                    // 延迟一帧，确保 state 更新后菜单数据是最新的
                    setTimeout(() => categoryCtxMenuRef.current?.show(e), 0)
                }}
            />

            {/* 分组标题右键菜单 */}
            <ContextMenus
                onContext={(ctx) => { categoryCtxMenuRef.current = ctx }}
                menus={activeCategoryId ? buildCategoryContextMenus(activeCategoryId) : []}
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
                onCreateCategory={() => { setManagePanelVisible(false); setCreateModalVisible(true) }}
            />
        </>
    )
}

export default ConversationListGrouped
