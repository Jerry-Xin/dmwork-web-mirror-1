// bridge/types.ts — UI 数据契约层类型定义

// ─── 分组模型 ───────────────────────────────────────────────
export interface UICategoryModel {
  id: string
  name: string
  sort: number
}

// ─── 会话视图模式 ─────────────────────────────────────────────
export type CategoryViewMode = 'flat' | 'grouped'

// ─── 视图切换控件 Props ──────────────────────────────────────
export interface UIViewToggleProps {
  mode: CategoryViewMode
  onToggle: (mode: CategoryViewMode) => void
}

// ─── 分组标题行 Props ─────────────────────────────────────────
export interface UICategoryHeaderProps {
  name: string
  collapsed: boolean
  unreadCount: number
  isEmpty: boolean
  onToggle: () => void
}

// ─── 分组列表视图 Props ───────────────────────────────────────
export interface UICategoryListViewProps {
  categories: UICategoryModel[]
  collapsedIds: string[]
  onToggleCollapse: (id: string) => void
  renderConversations: (categoryId: string | null) => React.ReactNode
  getUnreadCount: (categoryId: string | null) => number
}

// ─── 右键菜单 ─────────────────────────────────────────────────
export interface UIContextMenuItem {
  title: string
  danger?: boolean
  disabled?: boolean
  divider?: boolean          // true = 仅渲染分割线
  onClick?: () => void
  subItems?: UIContextMenuItem[]
}
