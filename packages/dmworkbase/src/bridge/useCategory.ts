import { useState, useEffect, useCallback } from 'react'
import WKApp from '../App'
import { UICategoryModel, CategoryViewMode } from './types'

/** 后端原始分组字段，仅供 useCategory 内部使用 */
interface RawCategoryItem {
  category_id: string
  name: string
  sort?: number
}

const VM_KEY = (spaceId: string) => `wk:cat:vm:${spaceId}`
const CI_KEY = (spaceId: string) => `wk:cat:ci:${spaceId}`

export function useCategory(spaceId: string) {
  const [categories, setCategories] = useState<UICategoryModel[]>([])
  const [viewMode, setViewModeState] = useState<CategoryViewMode>(() => {
    return (localStorage.getItem(VM_KEY(spaceId)) as CategoryViewMode) || 'flat'
  })
  const [collapsedIds, setCollapsedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CI_KEY(spaceId)) || '[]')
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(false)

  // ─── 加载分组列表 ──────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    if (!spaceId) return
    setLoading(true)
    try {
      const res = await WKApp.apiClient.get(`/v1/spaces/${spaceId}/categories`)
      const list: UICategoryModel[] = (res.data?.list || []).map((item: RawCategoryItem) => ({
        id: item.category_id,
        name: item.name,
        sort: item.sort ?? 0,
      }))
      list.sort((a, b) => a.sort - b.sort)
      setCategories(list)
    } catch (e) {
      console.error('[useCategory] loadCategories failed', e)
    } finally {
      setLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // ─── 视图切换（持久化）─────────────────────────────────────
  const setViewMode = useCallback((mode: CategoryViewMode) => {
    setViewModeState(mode)
    localStorage.setItem(VM_KEY(spaceId), mode)
  }, [spaceId])

  // ─── 折叠切换（持久化）─────────────────────────────────────
  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem(CI_KEY(spaceId), JSON.stringify(next))
      return next
    })
  }, [spaceId])

  // ─── 新建分组 ──────────────────────────────────────────────
  const createCategory = useCallback(async (name: string) => {
    await WKApp.apiClient.post(`/v1/spaces/${spaceId}/categories`, { name })
    await loadCategories()
  }, [spaceId, loadCategories])

  // ─── 重命名 ────────────────────────────────────────────────
  const renameCategory = useCallback(async (id: string, name: string) => {
    await WKApp.apiClient.put(`/v1/spaces/${spaceId}/categories/${id}`, { name })
    await loadCategories()
  }, [spaceId, loadCategories])

  // ─── 删除分组 ──────────────────────────────────────────────
  const deleteCategory = useCallback(async (id: string) => {
    await WKApp.apiClient.delete(`/v1/spaces/${spaceId}/categories/${id}`)
    setCollapsedIds(prev => prev.filter(x => x !== id))
    await loadCategories()
  }, [spaceId, loadCategories])

  // ─── 移动会话到分组 ────────────────────────────────────────
  const moveToCategory = useCallback(async (channelId: string, categoryId: string | null) => {
    await WKApp.apiClient.post(`/v1/spaces/${spaceId}/categories/members`, {
      channel_id: channelId,
      category_id: categoryId ?? '',   // 空字符串 = 移回未分类
    })
  }, [spaceId])

  return {
    categories,
    viewMode,
    collapsedIds,
    loading,
    setViewMode,
    toggleCollapse,
    createCategory,
    renameCategory,
    deleteCategory,
    moveToCategory,
    reload: loadCategories,
  }
}
