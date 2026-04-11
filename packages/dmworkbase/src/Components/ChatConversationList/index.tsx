/**
 * ChatConversationList
 * Chat 页面会话列表的统一出口。
 * - 持有分组数据（useCategoryList），所有 filter 下都可构建「移到分组」右键菜单
 * - filter === 'group' 时显示 ViewToggle + 分组视图
 * - 其他 filter 显示普通 ConversationList，右键菜单里有「移到分组」子菜单
 */
import React, { useState } from "react"
import { ChannelTypeGroup } from "wukongimjssdk"
import { Channel } from "wukongimjssdk"
import { useCategoryList } from "../../Hooks/useCategoryList"
import { ConversationWrap } from "../../Service/Model"
import { ConvFilter } from "../ConversationList"
import ConversationList from "../ConversationList"
import ConversationListGrouped from "../ConversationListGrouped"
import { ContextMenusData } from "../ContextMenus"

export interface ChatConversationListProps {
    conversations: ConversationWrap[]
    filter: ConvFilter
    select?: Channel
    onConversationClick: (conv: ConversationWrap) => void
    onClearMessages: (channel: Channel) => void
    onThreadOverflowClick: (groupNo: string) => void
}

const ChatConversationList: React.FC<ChatConversationListProps> = ({
    conversations,
    filter,
    select,
    onConversationClick,
    onClearMessages,
    onThreadOverflowClick,
}) => {
    const { categories, moveGroupToCategory } = useCategoryList()

    // 构建「移到分组」子菜单
    // - 仅群聊显示（调用处已保证，这里做二次过滤）
    // - 显示当前所属分组的 ✓ 标识
    const buildMoveToGroupMenus = (conv: ConversationWrap | undefined): ContextMenusData[] => {
        if (!conv || conv.channel.channelType !== ChannelTypeGroup) return []
        if (categories.length === 0) return []

        const groupNo = conv.channel.channelID
        // 找出当前群聊所在分组
        const currentCategoryId = categories.find(
            cat => (cat.groups || []).some(g => g.group_no === groupNo)
        )?.category_id

        const items: ContextMenusData[] = categories.map(cat => ({
            title: currentCategoryId === cat.category_id
                ? `✓ ${cat.name}`
                : cat.name,
            onClick: () => moveGroupToCategory(groupNo, cat.category_id!),
        }))

        items.push({ separator: true } as any)
        items.push({
            title: "+ 新建分组",
            onClick: () => {
                // 触发 ConversationListGrouped 里的创建弹窗
                // 通过 CustomEvent 通知
                window.dispatchEvent(new CustomEvent("wk:open-create-category"))
            },
        })

        return items
    }

    if (filter === 'group') {
        return (
            <ConversationListGrouped
                conversations={conversations}
                select={select}
                onConversationClick={onConversationClick}
                onClearMessages={onClearMessages}
                onThreadOverflowClick={onThreadOverflowClick}
            />
        )
    }

    return (
        <ConversationList
            conversations={conversations}
            select={select}
            filter={filter}
            onClick={onConversationClick}
            onClearMessages={onClearMessages}
            onThreadOverflowClick={onThreadOverflowClick}
            extraContextMenus={buildMoveToGroupMenus}
        />
    )
}

export default ChatConversationList
