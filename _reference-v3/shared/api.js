import { LIMITS, CHANNEL_TYPE } from './constants.js'

export class OctoApi {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl
    this.token = token
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      token: this.token,
    }
  }

  url(path) {
    const base = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl
    const p = path.startsWith('/') ? path : `/${path}`
    return `${base}${p}`
  }

  async loginByUsername(username, password) {
    const res = await fetch(this.url('/user/login/username'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, flag: 2 }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`登录失败 (${res.status}): ${body.slice(0, 120)}`)
    }
    const json = await res.json()
    const token = json.token ?? json.data?.token
    const uid = json.uid ?? json.data?.uid ?? json.user?.uid
    const name = json.name ?? json.data?.name ?? json.user?.name ?? uid
    if (!token || !uid) throw new Error('后端未返回 token/uid，请确认接口版本')
    return { token, user: { uid, name, avatar: json.avatar ?? json.data?.avatar } }
  }

  async fetchThreads() {
    try {
      const res = await fetch(this.url('/conversation/sync'), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ version: 0, last_msg_seqs: '', msg_count: 0 }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      const conversations = json.conversations ?? json.data?.conversations ?? json ?? []
      return (Array.isArray(conversations) ? conversations : [])
        .map((c) => this.toThread(c))
        .filter(Boolean)
    } catch (err) {
      console.warn('[Octo] fetchThreads fallback', err)
      return []
    }
  }

  toThread(c) {
    const channelId = c.channel_id ?? c.channelID ?? c.channelId
    const channelType = c.channel_type ?? c.channelType ?? 1
    if (!channelId) return null
    return {
      groupNo: channelType === CHANNEL_TYPE.GROUP ? channelId : '',
      shortId: '',
      channelId,
      channelType,
      name: c.name ?? c.channel_name ?? c.remark ?? channelId,
      lastMessageText: c.last_message?.payload?.content ?? c.last_message_text,
      lastMessageTime: c.last_message_timestamp ?? c.timestamp,
      unread: c.unread ?? 0,
    }
  }

  async fetchMessages(channelId, channelType, before) {
    const res = await fetch(this.url('/message/channel/sync'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        channel_id: channelId,
        channel_type: channelType,
        start_message_seq: before ?? 0,
        end_message_seq: 0,
        limit: LIMITS.MESSAGE_PAGE_SIZE,
        pull_mode: 1,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`拉取消息失败 (${res.status}): ${body.slice(0, 120)}`)
    }
    const json = await res.json()
    const list = json.messages ?? json.data?.messages ?? json ?? []
    return (Array.isArray(list) ? list : [])
      .map((m) => this.toMessage(m, channelId, channelType))
  }

  toMessage(m, channelId, channelType) {
    const payloadRaw = m.payload ?? m.content ?? {}
    const payload = typeof payloadRaw === 'string' ? this.safeParse(payloadRaw) : payloadRaw
    return {
      id: String(m.message_id ?? m.messageId ?? m.client_msg_no ?? Math.random()),
      clientMsgNo: m.client_msg_no ?? m.clientMsgNo,
      fromUid: m.from_uid ?? m.fromUid ?? '',
      fromName: m.from_name ?? m.fromName,
      fromAvatar: m.from_avatar ?? m.fromAvatar,
      isBot: Boolean(m.is_bot ?? m.isBot ?? (payload?.from_type === 2)),
      channelId,
      channelType,
      timestamp: (m.timestamp ?? m.message_timestamp ?? Date.now()) * (m.timestamp > 2_000_000_000 ? 1 : 1000),
      payload: {
        type: payload.type ?? payload.content_type ?? 1,
        content: payload.content ?? (typeof payloadRaw === 'string' ? payloadRaw : ''),
        ...payload,
      },
    }
  }

  safeParse(raw) {
    try { return JSON.parse(raw) } catch { return { type: 1, content: raw } }
  }

  async sendText(channelId, channelType, text, ctx) {
    const content = ctx ? this.formatWithContext(text, ctx) : text
    const res = await fetch(this.url('/message/send'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        channel_id: channelId,
        channel_type: channelType,
        client_msg_no: `octo-ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        payload: { type: 1, content },
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`发送失败 (${res.status}): ${body.slice(0, 120)}`)
    }
  }

  formatWithContext(text, ctx) {
    const title = ctx.title.length > LIMITS.TITLE_DISPLAY
      ? ctx.title.slice(0, LIMITS.TITLE_DISPLAY) + '…'
      : ctx.title
    const sel = ctx.selection.length > LIMITS.SELECTION_PREVIEW
      ? ctx.selection.slice(0, LIMITS.SELECTION_PREVIEW) + '…'
      : ctx.selection
    const quoted = sel.split('\n').map((l) => `> ${l}`).join('\n')
    return `[${title}](${ctx.url})\n\n${quoted}\n\n${text}`.trim()
  }
}
