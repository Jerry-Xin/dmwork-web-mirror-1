import { useMemo } from 'react'
import WKSDK, { Channel, ChannelTypePerson } from 'wukongimjssdk'
import WKApp from '../../App'
import { MessageWrap } from '../../Service/Model'
import { MessageContentTypeConst } from '../../Service/Const'
import { MessageRowUIProps } from './types'
import moment from 'moment'

export interface MessageRowSelectionState {
  /** 是否处于多选模式（来自 context.editOn()） */
  showCheckbox: boolean
  /** 当前消息是否被选中（来自 message.checked） */
  isSelected: boolean
  /** 点击 checkbox 时的回调（来自 context.checkeMessage） */
  onSelect?: (selected: boolean) => void
}

/**
 * getMessageRow - 纯函数版本
 *
 * @description 从 MessageWrap 提取 MessageRow 组件需要的 UI 数据（不使用 hooks）
 *
 * @param message - 业务消息对象
 * @param selection - 多选状态（从 context 传入）
 * @returns MessageRow 组件的 Props
 */
export function getMessageRow(
  message: MessageWrap,
  selection?: MessageRowSelectionState
): Omit<MessageRowUIProps, 'children'> {
  const channelInfo = WKSDK.shared().channelManager.getChannelInfo(
    new Channel(message.fromUID, ChannelTypePerson)
  )

  // 判断是否为连续消息（对齐 Model.tsx preIsSamePerson 逻辑）
  // 时间分隔符或撤回消息之后不算连续
  const pre = message.preMessage
  const isContinue = !!pre
    && pre.content?.contentType !== MessageContentTypeConst.time
    && !pre.revoke
    && pre.fromUID === message.fromUID

  // 格式化时间戳
  const timestamp = formatTimestamp(message.timestamp)
  const timeOnly = formatTimeOnly(message.timestamp)

  return {
    isSend: message.send,
    isContinue,
    isSelected: selection?.isSelected ?? false,
    showCheckbox: selection?.showCheckbox ?? false,
    showAvatar: !isContinue,
    avatarUrl: WKApp.shared.avatarUser(message.fromUID),
    senderName: channelInfo?.title || message.fromUID,
    timestamp,
    timeOnly,
    isOnline: channelInfo?.online,
    onSelect: selection?.onSelect,
  }
}

/**
 * useMessageRow Hook
 *
 * @description 从 MessageWrap 提取 MessageRow 组件需要的 UI 数据
 *
 * @param message - 业务消息对象
 * @returns MessageRow 组件的 Props
 */
export function useMessageRow(message: MessageWrap): Omit<MessageRowUIProps, 'children'> {
  return useMemo(() => getMessageRow(message), [message])
}

/**
 * 只返回 HH:mm，用于连续消息 hover 时显示
 */
function formatTimeOnly(timestamp: number): string {
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
  return moment(ms).format('HH:mm')
}

/**
 * 格式化时间戳
 * 
 * @param timestamp - 时间戳（秒或毫秒）
 * @returns 格式化后的时间字符串
 */
function formatTimestamp(timestamp: number): string {
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
  const now = Date.now()
  const diff = now - ms
  
  // 今天：显示 HH:mm
  if (diff < 86400 * 1000 && moment(ms).isSame(moment(), 'day')) {
    return moment(ms).format('HH:mm')
  }
  
  // 昨天：显示 "昨天 HH:mm"
  if (diff < 86400 * 2000 && moment(ms).isSame(moment().subtract(1, 'day'), 'day')) {
    return `昨天 ${moment(ms).format('HH:mm')}`
  }
  
  // 一周内：显示 "周X HH:mm"
  if (diff < 86400 * 7000) {
    return moment(ms).format('ddd HH:mm')
  }
  
  // 今年：显示 "MM-DD HH:mm"
  if (moment(ms).isSame(moment(), 'year')) {
    return moment(ms).format('MM-DD HH:mm')
  }
  
  // 跨年：显示 "YYYY-MM-DD HH:mm"
  return moment(ms).format('YYYY-MM-DD HH:mm')
}
