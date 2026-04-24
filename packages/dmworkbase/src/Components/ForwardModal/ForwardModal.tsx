import React, { useCallback } from "react"
import { Channel } from "wukongimjssdk"
import { X } from "lucide-react"
import { IconSearchStroked } from "@douyinfe/semi-icons"
import Checkbox from "../Checkbox"
import AiBadge from "../AiBadge"
import WKAvatar from "../WKAvatar"
import "./ForwardModal.css"

export interface ForwardItem {
  channelID: string
  channelType: number
  displayName: string
  avatarURL?: string
  isAI?: boolean
  hasThreads?: boolean
  isThread?: boolean
  parentChannelID?: string
}

export interface ForwardModalProps {
  title?: string
  items: ForwardItem[]
  allItems?: ForwardItem[]
  selectedIDs: string[]
  inputValue: string
  loading?: boolean
  onInputChange: (val: string) => void
  onToggleSelect: (item: ForwardItem) => void
  onConfirm: () => void
  onCancel?: () => void
}

// ─── 左列：可选列表项 ───────────────────────────────────────────

interface ItemRowProps {
  item: ForwardItem
  selected: boolean
  onToggle: (item: ForwardItem) => void
}

function ItemRow({ item, selected, onToggle }: ItemRowProps) {
  const channel = new Channel(item.channelID, item.channelType)
  return (
    <div
      className={`wk-fm-item${item.parentChannelID ? " wk-fm-item--child" : ""}${selected ? " wk-fm-item--selected" : ""}`}
      onClick={() => onToggle(item)}
    >
      <Checkbox
        checked={selected}
        onCheck={() => {}}
      />
      <div className="wk-fm-avatar-wrap">
        <WKAvatar channel={channel} />
      </div>
      <span className="wk-fm-item-name">{item.displayName}</span>
      {item.isAI && <AiBadge />}
    </div>
  )
}

// ─── 右列：已选列表项 ───────────────────────────────────────────

interface SelectedRowProps {
  item: ForwardItem
  onRemove: (item: ForwardItem) => void
}

function SelectedRow({ item, onRemove }: SelectedRowProps) {
  const channel = new Channel(item.channelID, item.channelType)
  return (
    <div className="wk-fm-selected-item">
      <div className="wk-fm-avatar-wrap">
        <WKAvatar channel={channel} />
      </div>
      <span className="wk-fm-item-name">{item.displayName}</span>
      <button
        className="wk-fm-remove-btn"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item)
        }}
        aria-label="移除"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  )
}

// ─── 主组件 ──────────────────────────────────────────────────────

export function ForwardModal({
  title = "转发",
  items,
  allItems,
  selectedIDs,
  inputValue,
  loading = false,
  onInputChange,
  onToggleSelect,
  onConfirm,
  onCancel,
}: ForwardModalProps) {
  const selectedSet = new Set(selectedIDs)
  const sourceForSelected = allItems ?? items
  const selectedItems = sourceForSelected.filter((i) => selectedSet.has(i.channelID))

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onInputChange(e.target.value)
    },
    [onInputChange]
  )

  return (
    <div className="wk-fm">
      {/* Header */}
      <div className="wk-fm-header">
        <span className="wk-fm-title">{title}</span>
      </div>

      {/* 内容区：左右两列 */}
      <div className="wk-fm-content">

        {/* 左列：搜索 + 可选列表 */}
        <div className="wk-fm-left">
          {/* 搜索框 */}
          <div className="wk-fm-search">
            <IconSearchStroked className="wk-fm-search-icon" />
            <input
              className="wk-fm-search-input"
              placeholder="搜索"
              type="text"
              value={inputValue}
              onChange={handleInputChange}
            />
          </div>

          {/* 可选列表 */}
          <div className="wk-fm-list">
            {loading ? (
              <div className="wk-fm-empty">加载中…</div>
            ) : items.length === 0 ? (
              <div className="wk-fm-empty">暂无联系人</div>
            ) : (
              items.map((item) => (
                <ItemRow
                  key={item.channelID}
                  item={item}
                  selected={selectedSet.has(item.channelID)}
                  onToggle={onToggleSelect}
                />
              ))
            )}
          </div>
        </div>

        {/* 分割线 */}
        <div className="wk-fm-divider" />

        {/* 右列：已选列表 */}
        <div className="wk-fm-right">
          {selectedItems.length === 0 ? (
            <div className="wk-fm-empty wk-fm-empty--right">未选择</div>
          ) : (
            <>
              <div className="wk-fm-selected-title">
                已选 {selectedItems.length} 人
              </div>
              <div className="wk-fm-selected-list">
                {selectedItems.map((item) => (
                  <SelectedRow
                    key={item.channelID}
                    item={item}
                    onRemove={onToggleSelect}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="wk-fm-footer">
        {onCancel && (
          <button className="wk-fm-btn wk-fm-btn--cancel" onClick={onCancel}>
            取消
          </button>
        )}
        <button
          className="wk-fm-btn wk-fm-btn--confirm"
          onClick={onConfirm}
          disabled={selectedIDs.length === 0}
        >
          {selectedIDs.length > 0 ? `确认(${selectedIDs.length})` : '确认'}
        </button>
      </div>
    </div>
  )
}

export default ForwardModal
