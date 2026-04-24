/**
 * ConversationSelect
 *
 * 对外接口保持不变（onFinished / title），内部由 ForwardModal + useForwardModal 实现。
 * 原有调用方（WKBase、Conversation/index.tsx、Chat/index.tsx）零改动。
 */
import React from "react"
import { Channel } from "wukongimjssdk"
import { ForwardModal } from "../ForwardModal/ForwardModal"
import { useForwardModal } from "../ForwardModal/useForwardModal"

interface ConversationSelectProps {
  onFinished?: (channels: Channel[]) => void
  onCancel?: () => void
  title?: string
}

export default function ConversationSelect({
  onFinished,
  onCancel,
  title,
}: ConversationSelectProps) {
  const { items, allItems, selectedIDs, inputValue, loading, setInputValue, toggleSelect, confirm } =
    useForwardModal(onFinished)

  return (
    <ForwardModal
      title={title}
      items={items}
      allItems={allItems}
      selectedIDs={selectedIDs}
      inputValue={inputValue}
      loading={loading}
      onInputChange={setInputValue}
      onToggleSelect={toggleSelect}
      onConfirm={confirm}
      onCancel={onCancel}
    />
  )
}
