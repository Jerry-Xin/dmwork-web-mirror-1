import React, { useRef, useEffect, useCallback } from "react"
import { Channel } from "wukongimjssdk"
import { Hash } from "lucide-react"
import { IconSearchStroked } from "@douyinfe/semi-icons"
import Checkbox from "../Checkbox"
import AiBadge from "../AiBadge"
import WKAvatar from "../WKAvatar"
import ThreadIcon from "../Icons/ThreadIcon"
import "./ForwardModal.css"

export interface ForwardItem {
  channelID: string
  channelType: number
  displayName: string
  avatarURL?: string
  isAI?: boolean
  /** 群聊是否有子区（控制 Hash 角标显示） */
  hasThreads?: boolean
  /** 是否是子区（显示 ThreadIcon 角标） */
  isThread?: boolean
  /** 子区所属父群 channelID，用于树状渲染时缩进 */
  parentChannelID?: string
}

export interface ForwardModalProps {
  title?: string
  /** 关键字过滤后的列表（用于渲染列表项） */
  items: ForwardItem[]
  /** 全量列表（用于已选头像区，不受搜索过滤影响） */
  allItems?: ForwardItem[]
  selectedIDs: string[]
  /** input 受控显示值（即时）；过滤由外部 debounce 后传 items */
  inputValue: string
  loading?: boolean
  onInputChange: (val: string) => void
  onToggleSelect: (item: ForwardItem) => void
  onConfirm: () => void
  onCancel?: () => void
}

interface SelectedAvatarProps {
  item: ForwardItem
  onRemove: (item: ForwardItem) => void
}

function SelectedAvatar({ item, onRemove }: SelectedAvatarProps) {
  const channel = new Channel(item.channelID, item.channelType)
  return (
    <div
      className="wk-forward-modal-selected-avatar"
      onClick={() => onRemove(item)}
      title={item.displayName}
    >
      <div className="wk-forward-modal-avatar-wrap">
        <WKAvatar channel={channel} />
        {item.isThread && (
          <span className="wk-forward-modal-badge wk-forward-modal-badge--thread">
            <ThreadIcon size={10} />
          </span>
        )}
        {!item.isThread && item.hasThreads && (
          <span className="wk-forward-modal-badge wk-forward-modal-badge--hash">
            <Hash size={10} strokeWidth={2.5} />
          </span>
        )}
      </div>
    </div>
  )
}

interface ItemRowProps {
  item: ForwardItem
  selected: boolean
  onToggle: (item: ForwardItem) => void
}

function ItemRow({ item, selected, onToggle }: ItemRowProps) {
  const channel = new Channel(item.channelID, item.channelType)
  return (
    <div
      className={`wk-forward-modal-item${item.parentChannelID ? " wk-forward-modal-item--child" : ""}`}
      onClick={() => onToggle(item)}
    >
      <Checkbox
        checked={selected}
        onCheck={() => {/* 由外层 div onClick 统一处理，避免双触发 */}}
      />
      <div className="wk-forward-modal-item-body">
        <div className="wk-forward-modal-avatar-wrap">
          <WKAvatar channel={channel} />
          {item.isThread && (
            <span className="wk-forward-modal-badge wk-forward-modal-badge--thread">
              <ThreadIcon size={10} />
            </span>
          )}
          {!item.isThread && item.hasThreads && (
            <span className="wk-forward-modal-badge wk-forward-modal-badge--hash">
              <Hash size={10} strokeWidth={2.5} />
            </span>
          )}
        </div>
        <span className="wk-forward-modal-item-name">{item.displayName}</span>
        {item.isAI && <AiBadge />}
      </div>
    </div>
  )
}

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
  const selectedAreaRef = useRef<HTMLDivElement>(null)

  // 已选 ID set，便于 O(1) 查找
  const selectedSet = new Set(selectedIDs)

  // 已选头像区用全量列表，搜索时不会消失
  const sourceForSelected = allItems ?? items
  const selectedItems = sourceForSelected.filter((i) => selectedSet.has(i.channelID))

  // 选中列表变化时自动滚到最右边（横向滚动）
  useEffect(() => {
    if (selectedAreaRef.current) {
      selectedAreaRef.current.scrollLeft = selectedAreaRef.current.scrollWidth
    }
  }, [selectedIDs.length])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onInputChange(e.target.value)
    },
    [onInputChange]
  )

  return (
    <div className="wk-forward-modal">
      {/* 标题 */}
      <div className="wk-forward-modal-title">{title}</div>

      {/* 已选头像 + 搜索框 */}
      <div className="wk-forward-modal-search-area">
        {selectedItems.length > 0 && (
          <div
            className="wk-forward-modal-selected-list"
            ref={selectedAreaRef}
          >
            {selectedItems.map((item) => (
              <SelectedAvatar
                key={item.channelID}
                item={item}
                onRemove={onToggleSelect}
              />
            ))}
          </div>
        )}
        <div className="wk-forward-modal-search-row">
          <IconSearchStroked
            className="wk-forward-modal-search-icon"
            style={{ color: "#bbbfc4", fontSize: "20px" }}
          />
          <input
            className="wk-forward-modal-search-input"
            placeholder="搜索"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* 列表区 */}
      <div className="wk-forward-modal-list-area">
        {loading ? (
          <div className="wk-forward-modal-loading">加载中…</div>
        ) : items.length === 0 ? (
          <div className="wk-forward-modal-empty">暂无联系人</div>
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

      {/* Footer */}
      <div className="wk-forward-modal-footer">
        {onCancel && (
          <button
            className="wk-forward-modal-cancel-btn"
            onClick={onCancel}
          >
            取消
          </button>
        )}
        <button
          className="wk-forward-modal-confirm-btn"
          onClick={onConfirm}
          disabled={selectedIDs.length === 0}
        >
          确认{selectedIDs.length > 0 ? `(${selectedIDs.length})` : ""}
        </button>
      </div>
    </div>
  )
}

export default ForwardModal
