import React, { useCallback, useEffect, useState } from 'react'
import WKSDK, { Channel, ChannelInfo, ChannelInfoListener, ChannelTypePerson } from 'wukongimjssdk'
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

export interface MessageRowInteractionState {
  /** 头像点击回调（私聊场景：点头像打开私聊，传入 fromUID） */
  onAvatarClick?: (uid: string, e: React.MouseEvent) => void
  /** 发送者名称点击回调（@ 场景：点名字展示用户信息，传入 fromUID） */
  onSenderNameClick?: (uid: string) => void
}

/**
 * 从 channelInfo 取优先级最高的展示名
 * 优先级：备注名(displayName) > title > uid
 */
function getSenderName(channelInfo: ChannelInfo | undefined, fromUID: string): string {
  return channelInfo?.orgData?.displayName || channelInfo?.title || fromUID
}

/**
 * getMessageRow - 纯函数版本（不含异步/监听逻辑）
 *
 * @description 从 MessageWrap 提取 MessageRow 组件需要的 UI 数据（不使用 hooks）
 *
 * @param message - 业务消息对象
 * @param selection - 多选状态（从 context 传入）
 * @returns MessageRow 组件的 Props
 */
export function getMessageRow(
  message: MessageWrap,
  selection?: MessageRowSelectionState,
  interaction?: MessageRowInteractionState
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

  // 把 uid 绑定到回调
  const uid = message.fromUID
  const onAvatarClick = interaction?.onAvatarClick
    ? (e: React.MouseEvent) => interaction.onAvatarClick!(uid, e)
    : undefined
  const onSenderNameClick = interaction?.onSenderNameClick
    ? () => interaction.onSenderNameClick!(uid)
    : undefined

  return {
    isSend: message.send,
    isContinue,
    isSelected: selection?.isSelected ?? false,
    showCheckbox: selection?.showCheckbox ?? false,
    showAvatar: !isContinue,
    avatarUrl: WKApp.shared.avatarUser(message.fromUID),
    senderName: getSenderName(channelInfo, message.fromUID),
    timestamp,
    timeOnly,
    isOnline: channelInfo?.online,
    onSelect: selection?.onSelect,
    onAvatarClick,
    onSenderNameClick,
  }
}

/**
 * useMessageRow Hook
 *
 * @description 从 MessageWrap 提取 MessageRow 组件需要的 UI 数据。
 *
 * 修复「发送者名称显示为 uid」问题：
 * - channelInfo 未缓存时，触发 fetchChannelInfo 异步拉取
 * - 注册 channelInfoListener，拉到结果后重新渲染（对齐 Base/index.tsx 的做法）
 * - senderName 优先取 displayName（备注名），其次 title，最后降级为 uid
 *
 * @param message - 业务消息对象
 * @returns MessageRow 组件的 Props
 */
export function useMessageRow(
  message: MessageWrap,
  selection?: MessageRowSelectionState,
  interaction?: MessageRowInteractionState
): Omit<MessageRowUIProps, 'children'> {
  // 用 tick 来触发重渲染（channelInfo 更新后）
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    const fromUID = message.fromUID
    if (!fromUID) return

    const channel = new Channel(fromUID, ChannelTypePerson)

    // 没有缓存时发起请求
    const cached = WKSDK.shared().channelManager.getChannelInfo(channel)
    if (!cached) {
      WKSDK.shared().channelManager.fetchChannelInfo(channel)
    }

    // 监听 channelInfo 更新，当对应 sender 的信息到达时重渲染
    const listener: ChannelInfoListener = (channelInfo: ChannelInfo) => {
      if (channelInfo?.channel?.channelID === fromUID) {
        forceUpdate()
      }
    }
    WKSDK.shared().channelManager.addListener(listener)

    return () => {
      WKSDK.shared().channelManager.removeListener(listener)
    }
  }, [message.fromUID, forceUpdate])

  return getMessageRow(message, selection, interaction)
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
