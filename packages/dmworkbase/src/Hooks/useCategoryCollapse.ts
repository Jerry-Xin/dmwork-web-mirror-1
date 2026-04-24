import { useState, useCallback, useEffect, useMemo } from "react"
import WKApp from "../App"

/**
 * useCategoryCollapse
 *
 * 管理分组的折叠/展开状态，持久化到 localStorage。
 *
 * key 格式：`category_collapse_{userId}_{spaceId}_{categoryId}`
 * - userId 和 spaceId 隔离，不同用户/space 状态互不干扰
 * - 无 spaceId 时 fallback 到 "default"，确保始终可用
 *
 * 使用前提：调用方需保证 categoryIds 在首次传入时已是完整数据（非空），
 * 否则应在外部等待 categories 加载完成后再 mount 使用该 hook 的组件。
 * 实践上通过给 ConversationListWithCategory 传 key={`${spaceId}-${categoryIds.join(',')}`}
 * 实现：分组数据就绪前不 mount，数据就绪后 mount 时同步读到正确状态。
 */

function buildKey(userId: string, spaceId: string, categoryId: string): string {
    return `category_collapse_${userId}_${spaceId}_${categoryId}`
}

function readCollapsed(userId: string, spaceId: string, categoryId: string): boolean {
    try {
        return localStorage.getItem(buildKey(userId, spaceId, categoryId)) === "1"
    } catch {
        return false
    }
}

function writeCollapsed(userId: string, spaceId: string, categoryId: string, collapsed: boolean): void {
    try {
        const key = buildKey(userId, spaceId, categoryId)
        if (collapsed) {
            localStorage.setItem(key, "1")
        } else {
            localStorage.removeItem(key)
        }
    } catch {
        // localStorage 写入失败（私人模式/配额已满）时静默忽略，不影响页面功能
    }
}

export function useCategoryCollapse(categoryIds: string[]) {
    const userId = WKApp.loginInfo?.uid || "unknown"
    const spaceId = WKApp.shared?.currentSpaceId || "default"

    // N1: 稳定 categoryIds 引用，避免 useEffect 无限触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const stableCategoryIds = useMemo(() => categoryIds, [categoryIds.join(",")])

    const readCurrentState = useCallback((): Set<string> => {
        const next = new Set<string>()
        for (const id of stableCategoryIds) {
            if (readCollapsed(userId, spaceId, id)) {
                next.add(id)
            }
        }
        return next
    }, [userId, spaceId, stableCategoryIds])

    // 同步初始化：组件 mount 时 categoryIds 应已是完整数据（调用方保证），
    // 此处同步读 localStorage，首次渲染即正确状态，无闪烁
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(readCurrentState)

    // B1 修复：userId 或 spaceId 变化时（切 Space / 退登重登），重新从 localStorage 读取
    // N2 覆盖：userId 纳入依赖，退登后不写错 key
    useEffect(() => {
        setCollapsedIds(readCurrentState())
    }, [userId, spaceId]) // eslint-disable-line react-hooks/exhaustive-deps

    const isCollapsed = useCallback(
        (categoryId: string): boolean => collapsedIds.has(categoryId),
        [collapsedIds]
    )

    const toggle = useCallback(
        (categoryId: string) => {
            setCollapsedIds(prev => {
                const next = new Set(prev)
                const nowCollapsed = next.has(categoryId)
                if (nowCollapsed) {
                    next.delete(categoryId)
                } else {
                    next.add(categoryId)
                }
                writeCollapsed(userId, spaceId, categoryId, !nowCollapsed)
                return next
            })
        },
        [userId, spaceId]
    )

    return { isCollapsed, toggle }
}
