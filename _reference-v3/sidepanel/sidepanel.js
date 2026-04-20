/**
 * Octo v3 · sidepanel — 对齐 Claude Design "Octo Extension v7"
 *
 * 结构：
 *   .ext
 *     ├ .demo-bar            — 顶栏 logo + 工作区 + 设置
 *     ├ .body                — rail + main
 *     │   ├ .rail            — 48px，pinned 会话 + +N + 底部 fn
 *     │   └ .main            — .head + .stream + .input-wrap
 *     └ #ovLayer             — 所有浮层：backdrop / toast / popovers /
 *                              drawers / picker / cmdk / lightbox
 *
 * 设计决策：
 * - Rail 只展示 pinned（上限 7），多于 7 个走 +N picker
 * - 消息区不再显示 agent 小标外的元信息（v7 简化）
 * - 右键 Rail → 快捷菜单（关闭 / 免打扰 / 固定 / 更多）
 */

import { DEMO_THREADS, DEMO_BASE_MESSAGES, DEMO_USER, DEMO_CATEGORIES, DEMO_CONTACTS } from '../shared/demoData.js'
import { CHANNEL_TYPE } from '../shared/constants.js'

/* ============================================================
   Tiny DOM helper
   ============================================================ */
function el(tag, attrs, children) {
  const n = document.createElement(tag)
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k]
      if (v == null || v === false) continue
      if (k === 'class') n.className = v
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v)
      else if (k === 'html') n.innerHTML = v
      else if (k === 'data' && typeof v === 'object') {
        for (const dk in v) n.dataset[dk] = v[dk]
      } else if (k.startsWith('on') && typeof v === 'function') {
        n.addEventListener(k.slice(2).toLowerCase(), v)
      } else n.setAttribute(k, v)
    }
  }
  if (children != null) {
    const arr = Array.isArray(children) ? children : [children]
    for (const c of arr) {
      if (c == null || c === false) continue
      if (c instanceof Node) n.appendChild(c)
      else n.appendChild(document.createTextNode(String(c)))
    }
  }
  return n
}

function svg(viewBox, pathD) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  s.setAttribute('viewBox', viewBox || '0 0 24 24')
  s.setAttribute('fill', 'none')
  s.setAttribute('stroke', 'currentColor')
  s.setAttribute('stroke-width', '2')
  s.setAttribute('stroke-linecap', 'round')
  s.setAttribute('stroke-linejoin', 'round')
  s.innerHTML = pathD
  return s
}

function fmtTime(ts) {
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)) }

/* ============================================================
   Icons (inline SVG path strings)
   ============================================================ */
const IC = {
  pin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-2-7V4H7v6z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  bell: '<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  bellOff: '<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  folder: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
  chevron: '<polyline points="9 18 15 12 9 6"/>',
  emoji: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/>',
  attach: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  send: '<path d="M3.5 11.5L20 4l-3.5 16.5-5-7z"/><path d="M11.5 13.5L20 4"/>',
  zap: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  tri: '<path d="M2 1l4 3-4 3z" fill="currentColor" stroke="none"/>',
  thread: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>',
  star: '<path d="M12 2l3 7h7l-5.5 4.5 2 7.5L12 17l-6.5 4 2-7.5L2 9h7z"/>',
}

function icon(name, sz) {
  const s = svg('0 0 24 24', IC[name] || '')
  if (sz) { s.setAttribute('width', sz); s.setAttribute('height', sz) }
  return s
}

/* ============================================================
   Constants + state
   ============================================================ */
const SPINNER_VERBS = [
  '思考', '推理', '梳理', '分析', '检索', '归纳', '斟酌', '对齐',
  '琢磨', '审视', '审阅', '解析', '推演', '打磨', '提炼', '整理',
  '研读', '构思', '拟定', '沉浸', '咀嚼', '推敲', '整合', '抽丝剥茧',
  '揣摩', '复盘', '盘算', '铺开', '梳头绪', '雕琢',
]

const COLORS_FOR_LETTER = {
  D: 'c-orange', F: 'c-purple', T: 'c-emerald',
  P: 'c-blue',   E: 'c-blue',   A: 'c-emerald',
  S: 'c-orange', M: 'c-purple', B: 'c-blue',
  L: 'c-emerald', O: 'c-purple',
}

const THEME_KEY = 'octo_v3_theme'
const LAYOUT_KEY = 'octo_v3_layout'
const PINNED_KEY = 'octo_v3_pinned'
const CURRENT_KEY = 'octo_v3_current_thread'
const DEFAULT_THEME = 'paper'
const DEFAULT_LAYOUT = 'message'
const PIN_LIMIT = 7

const state = {
  theme: DEFAULT_THEME,
  layout: DEFAULT_LAYOUT,
  threads: DEMO_THREADS,
  messagesByThread: DEMO_BASE_MESSAGES,
  currentId: null,
  pinned: new Set(),
  mutedSet: new Set(),
  expandedMsgs: new Set(),
}

function storageGet(keys) {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.get(keys, (res) => resolve(res || {}))
      } else {
        const r = {}
        for (const k of Array.isArray(keys) ? keys : [keys]) {
          try { const v = localStorage.getItem(k); if (v != null) r[k] = JSON.parse(v) } catch {}
        }
        resolve(r)
      }
    } catch { resolve({}) }
  })
}
function storageSet(obj) {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.set(obj, () => {})
    } else {
      for (const k in obj) { try { localStorage.setItem(k, JSON.stringify(obj[k])) } catch {} }
    }
  } catch {}
}

/* ============================================================
   Thread helpers
   ============================================================ */
function threadById(id) { return state.threads.find((t) => t.channelId === id) }
function threadLetter(t) {
  const raw = String(t.name || '').replace(/^[#\s]+/, '').trim()
  return Array.from(raw)[0] || '?'
}
function isPM(t) { return t.channelType === CHANNEL_TYPE.PERSON }
function isBot(t) { return !!t.isBot }
function unreadOf(t) { return t.unread || 0 }
function mentionOf(t) { return t.mentionCount || 0 }

function pickPinnedOrder() {
  // Pinned first (保持存储顺序)，然后按最近消息时间降序
  const pinned = [...state.pinned]
    .map((id) => threadById(id))
    .filter(Boolean)
  const rest = state.threads
    .filter((t) => !state.pinned.has(t.channelId))
    .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
  return { pinned, rest }
}

/* ============================================================
   Render — root shell
   ============================================================ */
const app = document.getElementById('app')
let ui = {}  // cached element refs

function mountShell() {
  app.innerHTML = ''
  const demoBar = buildDemoBar()
  const body = el('div', { class: 'body' })
  const rail = el('nav', { class: 'rail' })
  const main = el('section', { class: 'main' })
  body.appendChild(rail)
  body.appendChild(main)
  app.appendChild(demoBar)
  app.appendChild(body)
  app.appendChild(buildOverlayLayer())

  ui = { demoBar, body, rail, main, app }
}

function buildDemoBar() {
  const bar = el('div', { class: 'demo-bar' })
  bar.appendChild(el('span', { class: 'lg' }, 'O'))
  bar.appendChild(el('span', { class: 'nm' }, 'Octo'))
  bar.appendChild(el('span', { class: 'ws' }, 'FT-A2 工作区'))
  bar.appendChild(el('span', { class: 'spacer' }))
  const btnPin = el('button', { class: 'icn', title: '置顶侧栏' })
  btnPin.appendChild(icon('pin'))
  const btnSettings = el('button', {
    class: 'icn', id: 'btnSettings', title: '设置 / 主题 / 阅读模式',
    onclick: (e) => toggleSettingsPopover(e.currentTarget),
  })
  btnSettings.appendChild(icon('settings'))
  const btnClose = el('button', { class: 'icn', title: '关闭' })
  btnClose.appendChild(icon('close'))
  bar.appendChild(btnPin); bar.appendChild(btnSettings); bar.appendChild(btnClose)
  return bar
}

/* ============================================================
   Render — rail
   ============================================================ */
function renderRail() {
  const rail = ui.rail
  rail.innerHTML = ''

  const logo = el('button', {
    class: 'rail-logo',
    title: 'Octo v3',
    onclick: () => showToast('Octo v3 · Paper × Terminal × Moon'),
  }, 'O')
  rail.appendChild(logo)

  const { pinned, rest } = pickPinnedOrder()
  const visible = pinned.slice(0, PIN_LIMIT)

  // 如果没有 pinned，自动 seed 前 3 条
  if (visible.length === 0 && rest.length > 0) {
    for (const t of rest.slice(0, 3)) state.pinned.add(t.channelId)
    savePinned()
    const re = pickPinnedOrder()
    visible.push(...re.pinned.slice(0, PIN_LIMIT))
  }

  for (const t of visible) rail.appendChild(buildRailItem(t))

  const overflowCount = rest.length + Math.max(0, pinned.length - PIN_LIMIT)
  if (overflowCount > 0) {
    rail.appendChild(el('button', {
      class: 'rail-more',
      id: 'btnRailMore', title: '展开全部会话',
      onclick: () => openPicker(),
    }, `+${overflowCount}`))
  }

  rail.appendChild(el('div', { class: 'rail-spacer' }))
  rail.appendChild(el('div', { class: 'rail-divider' }))
  const btnNew = el('button', {
    class: 'rail-fn', id: 'btnNew', title: '新建',
    onclick: (e) => toggleNewPopover(e.currentTarget),
  })
  btnNew.appendChild(icon('plus'))
  const btnContacts = el('button', {
    class: 'rail-fn', id: 'btnContacts', title: '通讯录',
    onclick: () => openDrawer('drawerContacts'),
  })
  btnContacts.appendChild(icon('users'))
  rail.appendChild(btnNew)
  rail.appendChild(btnContacts)
}

function buildRailItem(t) {
  const isMention = mentionOf(t) > 0
  const isCurrent = state.currentId === t.channelId
  const btn = el('button', {
    class: 'rail-item' + (isCurrent ? ' is-current' : ''),
    title: (t.name || '').replace(/^#\s*/, ''),
    'data-label': t.name || '',
    'data-type': isPM(t) ? 'dm' : 'channel',
    onclick: () => selectThread(t.channelId),
    oncontextmenu: (e) => { e.preventDefault(); openRailItemMenu(e, t) },
  })

  // Base tile: channel letter or PM circle (even for @mention, since we overlay badge)
  if (isPM(t)) {
    btn.appendChild(el('span', { class: 'r-pm' }, threadLetter(t)))
  } else {
    const letter = threadLetter(t).toUpperCase()
    const color = COLORS_FOR_LETTER[letter] || 'c-purple'
    btn.appendChild(el('span', { class: `r-ch ${color}` }, letter))
  }

  if (state.pinned.has(t.channelId)) btn.appendChild(el('span', { class: 'r-pin' }))

  // Overlay badges: @ mention takes precedence, else numeric unread
  if (!isCurrent) {
    if (isMention) {
      btn.appendChild(el('span', { class: 'r-mention', title: `${mentionOf(t)} 条 @ 提醒` }, '@'))
    } else if (unreadOf(t) > 0) {
      const n = unreadOf(t)
      btn.appendChild(el('span', {
        class: 'r-badge',
        title: `${n} 条未读`,
      }, n > 99 ? '99+' : String(n)))
    }
  }
  return btn
}

/* ============================================================
   Render — main (head + stream + composer)
   ============================================================ */
function renderMain() {
  ui.main.innerHTML = ''
  const t = threadById(state.currentId)

  ui.main.appendChild(buildHead(t))
  ui.stream = el('div', { class: 'stream', id: 'stream' })
  ui.main.appendChild(ui.stream)

  if (t) {
    renderMessages(t)
  } else {
    ui.stream.appendChild(el('div', { class: 'empty' }, [
      el('span', { class: 'emo' }, '📬'),
      '选一个会话开始阅读',
    ]))
  }

  ui.main.appendChild(buildInput(t))
}

function buildHead(t) {
  const head = el('header', { class: 'head' })
  const title = el('div', { class: 'head-title' })
  const main = el('span', { class: 'head-main' })
  if (!t) {
    main.appendChild(document.createTextNode('Octo'))
  } else if (isPM(t)) {
    main.appendChild(document.createTextNode(t.name || ''))
  } else {
    main.appendChild(el('span', { class: 'hash' }, '#'))
    main.appendChild(document.createTextNode((t.name || '').replace(/^[#\s]+/, '')))
  }
  title.appendChild(main)
  head.appendChild(title)

  const icns = el('div', { class: 'head-icns' })
  const btnSearch = el('button', {
    class: 'head-icn', id: 'btnHeadSearch', title: '搜索',
    onclick: (e) => toggleSearchPopover(e.currentTarget),
  })
  btnSearch.appendChild(icon('search'))
  icns.appendChild(btnSearch)
  head.appendChild(icns)

  if (t && !isPM(t)) {
    const members = 3 + (threadLetter(t).charCodeAt(0) % 9) + 1
    const peer = el('button', {
      class: 'head-peer', id: 'btnMembers', title: '查看成员',
      onclick: () => openDrawer('drawerMembers'),
    })
    peer.innerHTML = `共 <b>${members}</b> 人`
    head.appendChild(peer)
  } else if (t && isPM(t)) {
    const peer = el('span', { class: 'head-peer' })
    peer.innerHTML = isBot(t) ? '<b>Agent</b> · 已连接' : '私聊'
    head.appendChild(peer)
  }

  return head
}

/* ============================================================
   Render — messages
   ============================================================ */
function renderMessages(t) {
  ui.stream.innerHTML = ''
  const msgs = state.messagesByThread[t.channelId] || []
  if (msgs.length === 0) {
    ui.stream.appendChild(el('div', { class: 'empty' }, [
      el('span', { class: 'emo' }, '💬'),
      '暂无消息，说点什么',
    ]))
    return
  }
  for (const m of msgs) ui.stream.appendChild(buildMessage(m))
  queueMicrotask(() => { ui.stream.scrollTop = ui.stream.scrollHeight })
}

function buildMessage(m) {
  const isMine = m.fromUid === DEMO_USER.uid
  const isBotMsg = !!m.isBot
  const tone = isMine ? 'is-mine' : (isBotMsg ? 'is-bot' : 'is-other')
  const avatarChar = avatarCharFor(m)
  const avatarTone = avatarToneFor(m)

  const node = el('div', {
    class: `msg ${tone}`,
    'data-id': m.id,
    'data-avatar-tone': avatarTone,
  })

  const ts = el('div', { class: 'ts' })
  const dot = el('div', { class: 'ts-dot', 'data-avatar-char': avatarChar })
  ts.appendChild(dot)
  ts.appendChild(el('div', { class: 'ts-line' }))
  node.appendChild(ts)

  const head = el('div', { class: 'head-row' })
  head.appendChild(el('span', { class: 'name' }, m.fromName || '(未知)'))
  if (isBotMsg) head.appendChild(el('span', { class: 'agent-tag' }, 'Agent'))
  head.appendChild(el('span', { class: 'time' }, fmtTime(m.timestamp)))
  node.appendChild(head)

  // Ops buttons (copy only; hover-shown via CSS)
  const ops = el('div', { class: 'msg-ops' })
  const opCopy = el('button', {
    class: 'msg-op', title: '复制',
    onclick: () => {
      try {
        navigator.clipboard.writeText(messageText(m))
        showToast('已复制')
      } catch {}
    },
  })
  opCopy.appendChild(icon('check'))
  ops.appendChild(opCopy)
  node.appendChild(ops)

  const body = el('div', { class: 'body-row' })
  const text = messageText(m)
  const shouldCollapse = m.id && !state.expandedMsgs.has(m.id) && shouldCollapseText(text)
  if (shouldCollapse) {
    const wrap = el('div', { class: 'collapsed' })
    renderMsgContent(wrap, text, m)
    body.appendChild(wrap)
    const link = el('button', {
      class: 'expand-link',
      onclick: () => { state.expandedMsgs.add(m.id); renderMessages(threadById(state.currentId)) },
    })
    link.appendChild(document.createTextNode('展开全部 '))
    const lines = text.split('\n').length
    link.appendChild(el('span', { class: 'count' }, `(+${lines - 8} 行)`))
    body.appendChild(link)
  } else {
    renderMsgContent(body, text, m)
  }
  node.appendChild(body)

  return node
}

function messageText(m) {
  return (m?.payload?.content || '').toString()
}

function avatarCharFor(m) {
  // 🦞 / T / 龙 / 梦 / 王 — 取名字首字 / emoji / ASCII 首
  if (m.isBot && (m.fromName || '').includes('龙虾')) return '🦞'
  if (m.isBot && (m.fromName || '').match(/Thomas/i)) return 'T'
  const raw = (m.fromName || '?').trim()
  return Array.from(raw)[0] || '?'
}

function avatarToneFor(m) {
  if (m.fromUid === DEMO_USER.uid) return 'mine'
  if (m.isBot) return 'bot'
  // Hash to a stable tone per uid
  const s = m.fromUid || m.fromName || ''
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  const tones = ['teal', 'amber', 'coral', 'other']
  return tones[Math.abs(h) % tones.length]
}

function shouldCollapseText(s) {
  const lines = s.split('\n').length
  return lines > 10 || s.length > 540
}

function renderMsgContent(host, text, m) {
  // Strip a leading [name](url) linky to a src chip if followed by blockquote
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // code fence block
    if (line.startsWith('```')) {
      const buf = []
      let j = i + 1
      while (j < lines.length && !lines[j].startsWith('```')) { buf.push(lines[j]); j++ }
      const pre = el('pre', null, buf.join('\n'))
      host.appendChild(pre)
      i = j
      continue
    }
    // [text](url) standalone → src chip
    const linkOnly = line.match(/^\[(.+?)\]\((https?:\/\/[^\s)]+)\)$/)
    if (linkOnly) {
      const a = el('a', { class: 'src', href: linkOnly[2], target: '_blank', rel: 'noopener noreferrer' })
      const host_ = new URL(linkOnly[2]).hostname.replace(/^www\./, '')
      a.appendChild(el('span', { class: 'src-icon' }, host_[0]?.toUpperCase() || '?'))
      a.appendChild(el('span', { class: 'src-label' }, host_.split('.')[0]))
      a.appendChild(el('span', { class: 'src-dot' }, '·'))
      a.appendChild(el('span', { class: 'src-title' }, linkOnly[1]))
      host.appendChild(a)
      continue
    }
    if (line.startsWith('> ')) {
      // Accumulate contiguous blockquote lines
      const buf = [line.slice(2)]
      let j = i + 1
      while (j < lines.length && lines[j].startsWith('> ')) { buf.push(lines[j].slice(2)); j++ }
      const q = el('div', { class: 'quote' })
      for (const p of buf) q.appendChild(el('p', null, renderInline(p)))
      host.appendChild(q)
      i = j - 1
      continue
    }
    if (line.startsWith('- ')) {
      const buf = [line.slice(2)]
      let j = i + 1
      while (j < lines.length && lines[j].startsWith('- ')) { buf.push(lines[j].slice(2)); j++ }
      const ul = el('ul')
      for (const p of buf) ul.appendChild(el('li', null, renderInline(p)))
      host.appendChild(ul)
      i = j - 1
      continue
    }
    if (line.trim() === '') { host.appendChild(el('div', { style: { height: '4px' } })); continue }
    host.appendChild(el('p', null, renderInline(line)))
  }
}

function renderInline(text) {
  const frag = document.createDocumentFragment()
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)))
    if (m[1]) frag.appendChild(el('span', { class: 'code' }, m[1].slice(1, -1)))
    else if (m[2]) frag.appendChild(el('strong', null, m[2].slice(2, -2)))
    else if (m[3]) {
      const lm = m[3].match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
      if (lm) frag.appendChild(el('a', {
        class: 'inline', href: lm[2], target: '_blank', rel: 'noopener noreferrer',
      }, lm[1]))
    }
    last = m.index + m[0].length
  }
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)))
  return frag
}

/* ============================================================
   Composer
   ============================================================ */
let composer = { attachments: [], ta: null, charcount: null, send: null, chips: null }

function buildInput(t) {
  const wrap = el('div', { class: 'input-wrap' })
  const card = el('div', { class: 'input-card' })

  composer.chips = el('div', { class: 'composer-chips' })
  card.appendChild(composer.chips)

  composer.ta = el('textarea', {
    class: 'input-area',
    placeholder: t ? (isPM(t) ? `发消息给 ${t.name}` : `#${(t.name || '').replace(/^#\s*/, '')}`) : '输入消息',
    rows: '1',
  })
  composer.ta.addEventListener('input', () => {
    composer.ta.style.height = 'auto'
    composer.ta.style.height = Math.min(composer.ta.scrollHeight, 180) + 'px'
    const n = composer.ta.value.length
    composer.charcount.querySelector('.cur').textContent = String(n)
    composer.send.classList.toggle('is-active', n > 0 || composer.attachments.length > 0)
  })
  composer.ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  })
  card.appendChild(composer.ta)

  const bar = el('div', { class: 'input-toolbar' })
  const tools = el('div', { class: 'input-tools' })
  tools.appendChild(toolBtn('emoji', '表情', () => showToast('表情选择器 · 待实现')))
  tools.appendChild(toolBtn('at', '提及', () => {
    const cur = composer.ta.value
    composer.ta.value = cur + '@'
    composer.ta.focus()
    composer.ta.dispatchEvent(new Event('input', { bubbles: true }))
  }, 'mention'))
  tools.appendChild(toolBtn('attach', '附件', openAttachPicker))
  tools.appendChild(toolBtn('expand', '全屏编辑', () => openFullComposer()))
  bar.appendChild(tools)

  bar.appendChild(el('span', { class: 'input-spacer' }))

  composer.charcount = el('span', { class: 'charcount' })
  composer.charcount.innerHTML = '<span class="cur">0</span> / 2000'
  bar.appendChild(composer.charcount)

  composer.send = el('button', {
    class: 'send', title: '发送 (Enter)', onclick: handleSend,
  })
  composer.send.appendChild(icon('send'))
  bar.appendChild(composer.send)

  card.appendChild(bar)
  wrap.appendChild(card)
  return wrap
}

function toolBtn(iconName, title, handler, extra) {
  const b = el('button', { class: 'input-tool' + (extra ? ' ' + extra : ''), title, onclick: handler })
  b.appendChild(icon(iconName))
  return b
}

function openAttachPicker() {
  const fi = document.createElement('input')
  fi.type = 'file'
  fi.accept = 'image/*,*/*'
  fi.multiple = true
  fi.addEventListener('change', async () => {
    for (const f of fi.files || []) await addAttachment(f)
  })
  fi.click()
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

async function addAttachment(file) {
  if (!file) return
  if (file.size > 10 * 1024 * 1024) { showToast('附件不能超过 10MB'); return }
  try {
    const dataUrl = await fileToDataUrl(file)
    composer.attachments.push({
      name: file.name || 'attachment',
      size: file.size,
      type: (file.type || '').startsWith('image/') ? 'image' : 'file',
      dataUrl,
    })
    renderComposerChips()
    composer.send.classList.add('is-active')
  } catch (err) {
    showToast('读文件失败')
  }
}

function renderComposerChips() {
  composer.chips.innerHTML = ''
  composer.attachments.forEach((att, i) => {
    const chip = el('div', { class: 'chip-file', title: att.name })
    chip.appendChild(el('span', { class: 'fn' }, att.name))
    const rm = el('button', {
      class: 'rm', title: '移除',
      onclick: () => { composer.attachments.splice(i, 1); renderComposerChips() },
    }, '×')
    chip.appendChild(rm)
    composer.chips.appendChild(chip)
  })
}

function handleSend() {
  const text = composer.ta.value.trim()
  const atts = composer.attachments
  if (!text && atts.length === 0) return
  const t = threadById(state.currentId)
  if (!t) { showToast('请先选一个会话'); return }

  const msgs = state.messagesByThread[t.channelId] || []
  const nextId = `v3-${Date.now()}`
  msgs.push({
    id: nextId, fromUid: DEMO_USER.uid, fromName: DEMO_USER.name,
    isBot: false, channelId: t.channelId, channelType: t.channelType,
    timestamp: Date.now(), payload: { type: 1, content: text || '(附件)' },
  })
  state.messagesByThread[t.channelId] = msgs
  t.lastMessageText = text
  t.lastMessageTime = Date.now()
  composer.ta.value = ''
  composer.attachments = []
  renderComposerChips()
  composer.ta.dispatchEvent(new Event('input', { bubbles: true }))
  renderMessages(t)
  showToast('已发送 · demo')

  // If sending to a bot thread, auto-reply with a spinner stub
  if (isBot(t)) simulateBotReply(t)
}

function simulateBotReply(t) {
  // Spinner row in stream
  const wrapper = el('div', { class: 'msg is-bot' })
  wrapper.appendChild(el('div', { class: 'ts' }, [
    el('div', { class: 'ts-dot' }), el('div', { class: 'ts-line' }),
  ]))
  wrapper.appendChild(el('div', { class: 'head-row' }, [
    el('span', { class: 'name' }, t.name),
    el('span', { class: 'agent-tag' }, 'Agent'),
    el('span', { class: 'time' }, fmtTime(Date.now())),
  ]))
  const sp = el('div', { class: 'spinner-row' })
  sp.appendChild(el('span', { class: 'dotz' }))
  const verb = el('span', { class: 'verb' }, SPINNER_VERBS[0])
  sp.appendChild(verb)
  wrapper.appendChild(sp)
  ui.stream.appendChild(wrapper)
  ui.stream.scrollTop = ui.stream.scrollHeight

  let i = 0
  const intv = setInterval(() => {
    i = (i + 1) % SPINNER_VERBS.length
    verb.style.opacity = '0'
    setTimeout(() => { verb.textContent = SPINNER_VERBS[i]; verb.style.opacity = '1' }, 150)
  }, 1500)

  setTimeout(() => {
    clearInterval(intv)
    wrapper.remove()
    const msgs = state.messagesByThread[t.channelId] || []
    msgs.push({
      id: `v3-bot-${Date.now()}`, fromUid: 'bot-' + t.channelId,
      fromName: t.name, isBot: true,
      channelId: t.channelId, channelType: t.channelType,
      timestamp: Date.now(),
      payload: { type: 1, content: '收到，正在处理你的请求 · 这是 v3 的演示回复。\n\n建议：\n- 切换主题（Paper / Terminal / Moonwire）\n- 切换阅读模式（消息版 / CLI）\n- 试试 **⌘K** 呼出搜索' },
    })
    state.messagesByThread[t.channelId] = msgs
    renderMessages(t)
  }, 2500)
}

/* ============================================================
   Overlay layer
   ============================================================ */
function buildOverlayLayer() {
  const wrap = el('div', { id: 'ovLayer' })
  wrap.appendChild(el('div', { class: 'ov-backdrop', id: 'ovBackdrop' }))
  wrap.appendChild(el('div', { class: 'ov-toast', id: 'ovToast' }, '已复制'))

  // Settings popover
  const popSettings = el('div', {
    class: 'ov-pop', id: 'popSettings',
    style: { width: '240px' },
  })
  popSettings.appendChild(el('div', { class: 'ov-pop-header' }, '阅读模式'))
  const layoutSeg = el('div', { class: 'ov-seg', 'data-role': 'layout' })
  layoutSeg.appendChild(el('button', {
    'data-v': 'message', onclick: () => setLayout('message'),
  }, '消息版'))
  layoutSeg.appendChild(el('button', {
    'data-v': 'cli', onclick: () => setLayout('cli'),
  }, 'CLI'))
  popSettings.appendChild(layoutSeg)
  popSettings.appendChild(el('div', { class: 'ov-pop-header' }, '主题'))
  const themeSeg = el('div', { class: 'ov-seg', 'data-role': 'theme' })
  const themeDefs = [['paper', 'Paper'], ['terminal', 'Term'], ['moonwire', 'Moon']]
  for (const [id, label] of themeDefs) {
    const b = el('button', { 'data-v': id, onclick: () => setTheme(id) })
    b.appendChild(el('span', { class: 'dot' }))
    b.appendChild(document.createTextNode(label))
    themeSeg.appendChild(b)
  }
  popSettings.appendChild(themeSeg)
  wrap.appendChild(popSettings)

  // Search popover (3 tabs)
  wrap.appendChild(buildSearchPopover())

  // Rail + new popover
  wrap.appendChild(buildNewPopover())

  // Rail right-click popover
  wrap.appendChild(buildRailItemPopover())

  // Group info drawer
  wrap.appendChild(buildMembersDrawer())

  // Contacts drawer
  wrap.appendChild(buildContactsDrawer())

  // Picker
  wrap.appendChild(buildPicker())

  // Cmd+K
  wrap.appendChild(buildCmdkOverlay())

  // Fullscreen composer
  wrap.appendChild(buildFullComposer())

  // Lightbox
  wrap.appendChild(buildLightbox())

  return wrap
}

function buildSearchPopover() {
  const p = el('div', {
    class: 'ov-pop ov-pop-search', id: 'popSearch',
    style: { width: '340px' },
  })
  const inputRow = el('div', { class: 'sr-input' })
  inputRow.appendChild(icon('search'))
  const input = el('input', { placeholder: '搜索本会话…', id: 'srInput' })
  inputRow.appendChild(input)
  inputRow.appendChild(el('span', { class: 'kbd' }, '⌘K 全局'))
  p.appendChild(inputRow)

  const tabs = el('div', { class: 'sr-tabs' })
  const tabDefs = [
    ['people', '联系人', 3],
    ['groups', '群组', 2],
    ['files', '文件', 5],
  ]
  for (const [id, label, n] of tabDefs) {
    const b = el('button', {
      class: 'sr-tab' + (id === 'people' ? ' is-active' : ''),
      'data-tab': id,
      onclick: (e) => {
        p.querySelectorAll('.sr-tab').forEach((x) => x.classList.toggle('is-active', x.dataset.tab === id))
        p.querySelectorAll('.sr-pane').forEach((pane) => { pane.hidden = pane.dataset.tab !== id })
      },
    })
    b.appendChild(document.createTextNode(label + ' '))
    b.appendChild(el('span', { class: 'n' }, String(n)))
    tabs.appendChild(b)
  }
  p.appendChild(tabs)

  const body = el('div', { class: 'sr-body' })
  // People pane
  body.appendChild(searchPane('people', [
    { avClass: 'teal', letter: '梦', nm: '梦林', role: '后端 · 在线' },
    { avClass: '', letter: '王', nm: '王宜<mark>林</mark>', role: '前端 · 本会话' },
    { avClass: 'coral', letter: '沙', nm: '沙东惠', role: 'PM · 本会话' },
  ], 'person'))
  body.appendChild(searchPane('groups', [
    { avClass: 'sq', letter: 'D', nm: '# DMWork Committer Sync', role: '研发频道 · 11 人 · 当前' },
    { avClass: 'sq', letter: 'F', nm: '# Feishu PM', role: '产品讨论 · 24 人' },
  ], 'group'))
  body.appendChild(searchPane('files', [
    { file: 'cursor-feedback-01.png', role: '王宜林 · 14:21 · 182 KB', thumb: 'linear-gradient(135deg,#E0D8F5,#C4B8ED)' },
    { file: 'cursor-feedback-02.png', role: '王宜林 · 14:21 · 256 KB', thumb: 'linear-gradient(135deg,#F5D8E0,#EDB8C4)' },
    { file: 'PRD-Sidebar-v2.1.pdf', role: '沙东惠 · 昨天 · 1.4 MB', doc: 'PDF' },
    { file: 'GROUP.md', role: '梦林 · 3 天前 · 8 KB', doc: 'MD' },
    { file: 'sidebar-mock-03.png', role: '沙东惠 · 上周 · 412 KB', thumb: 'linear-gradient(135deg,#D8F5E0,#B8EDC4)' },
  ], 'file'))
  p.appendChild(body)
  return p
}

function searchPane(tabId, rows, kind) {
  const pane = el('div', { class: 'sr-pane', 'data-tab': tabId })
  if (tabId !== 'people') pane.hidden = true
  for (const r of rows) {
    const row = el('div', {
      class: 'sr-row', onclick: () => { closeAllPopovers(); showToast('打开 · 待实现') },
    })
    if (kind === 'file') {
      if (r.doc) {
        const th = el('div', { class: 'thumb sr-doc' })
        th.appendChild(el('span', null, r.doc))
        row.appendChild(th)
      } else {
        row.appendChild(el('div', { class: 'thumb', style: { background: r.thumb } }))
      }
    } else {
      row.appendChild(el('div', { class: `av ${r.avClass || ''}` }, r.letter))
    }
    const txt = el('div', { class: 'txt' })
    const nm = el('span', { class: 'nm' })
    nm.innerHTML = r.nm || r.file
    txt.appendChild(nm)
    txt.appendChild(el('span', { class: 'role' }, r.role))
    row.appendChild(txt)
    pane.appendChild(row)
  }
  return pane
}

function buildNewPopover() {
  const p = el('div', { class: 'ov-pop', id: 'popNew', style: { width: '200px' } })
  p.appendChild(el('div', { class: 'ov-pop-header' }, '新建'))
  const items = [
    ['group',    '发起群聊', 'users'],
    ['dm',       '发起私聊', 'at'],
    ['category', '创建分组', 'folder'],
  ]
  for (const [key, label, ic] of items) {
    const b = el('button', {
      class: 'ov-pop-item',
      onclick: () => { closeAllPopovers(); showToast(label + ' · 待实现') },
    })
    b.appendChild(icon(ic))
    b.appendChild(document.createTextNode(label))
    p.appendChild(b)
  }
  return p
}

function buildRailItemPopover() {
  const p = el('div', { class: 'ov-pop', id: 'popRailItem', style: { width: '220px' } })
  p.appendChild(el('div', { class: 'ov-pop-header', id: 'popRailItemLabel' }, '会话'))
  const actions = [
    ['close',   '关闭聊天窗口', 'close'],
    ['mute',    '开启免打扰',   'bellOff'],
    ['unpin',   '取消固定',     'pin'],
  ]
  for (const [key, label, ic] of actions) {
    const b = el('button', {
      class: 'ov-pop-item', 'data-action': key,
      onclick: () => { closeAllPopovers(); handleRailAction(key) },
    })
    b.appendChild(icon(ic))
    b.appendChild(document.createTextNode(label))
    p.appendChild(b)
  }
  p.appendChild(el('div', { class: 'ov-pop-sep' }))
  const more = el('button', {
    class: 'ov-pop-item', 'data-action': 'more',
    onclick: () => { closeAllPopovers(); showToast('更多 · 待实现') },
  })
  more.appendChild(icon('dots'))
  more.appendChild(document.createTextNode('更多'))
  p.appendChild(more)
  return p
}

function openRailItemMenu(ev, t) {
  const p = document.getElementById('popRailItem')
  document.getElementById('popRailItemLabel').textContent = (t.name || '').replace(/^#\s*/, '')
  p._targetId = t.channelId
  // Toggle label of unpin/mute
  const actions = p.querySelectorAll('.ov-pop-item')
  actions.forEach((b) => {
    if (b.dataset.action === 'unpin') {
      const lbl = state.pinned.has(t.channelId) ? '取消固定' : '固定到侧栏'
      b.lastChild.textContent = lbl
    } else if (b.dataset.action === 'mute') {
      const lbl = state.mutedSet.has(t.channelId) ? '关闭免打扰' : '开启免打扰'
      b.lastChild.textContent = lbl
    }
  })
  const extRect = ui.app.getBoundingClientRect()
  const pw = 220
  let left = ev.clientX - extRect.left + 6
  let top = ev.clientY - extRect.top
  left = clamp(left, 8, extRect.width - pw - 8)
  top = clamp(top, 8, extRect.height - 160)
  positionPop(p, left, top, pw)
  openPop(p)
}

function handleRailAction(key) {
  const p = document.getElementById('popRailItem')
  const tid = p._targetId
  if (!tid) return
  if (key === 'close') {
    state.pinned.delete(tid)
    savePinned()
    if (state.currentId === tid) { state.currentId = null }
    renderRail(); renderMain(); showToast('已关闭')
  } else if (key === 'mute') {
    if (state.mutedSet.has(tid)) state.mutedSet.delete(tid)
    else state.mutedSet.add(tid)
    showToast(state.mutedSet.has(tid) ? '已开启免打扰' : '已关闭免打扰')
  } else if (key === 'unpin') {
    if (state.pinned.has(tid)) state.pinned.delete(tid)
    else if (state.pinned.size < PIN_LIMIT) state.pinned.add(tid)
    else { showToast(`最多固定 ${PIN_LIMIT} 个`); return }
    savePinned(); renderRail(); showToast('已更新固定')
  }
}

function buildMembersDrawer() {
  const d = el('div', { class: 'ov-drawer', id: 'drawerMembers' })
  const head = el('div', { class: 'ov-drawer-head' })
  head.appendChild(el('div', { class: 'ov-drawer-title' }, '群信息'))
  const cbtn = el('button', { class: 'ov-drawer-close', onclick: () => closeDrawer('drawerMembers') })
  cbtn.appendChild(icon('close'))
  head.appendChild(cbtn)
  d.appendChild(head)

  const body = el('div', { class: 'ov-drawer-body', style: { padding: '0' } })

  const hero = el('div', { class: 'gi-hero' })
  const ava = el('div', { class: 'gi-avatar' }, 'DM')
  hero.appendChild(ava)
  const hb = el('div', { class: 'gi-body' })
  const hn = el('div', { class: 'gi-name' })
  hn.appendChild(document.createTextNode('DMWork Committer Sync '))
  hn.appendChild(el('span', { class: 'gi-channel' }, '# 讨论'))
  hb.appendChild(hn)
  hb.appendChild(el('div', { class: 'gi-meta' }, '11 人 · 2 AI · Issue #249'))
  hero.appendChild(hb)
  body.appendChild(hero)

  body.appendChild(el('div', { class: 'gi-section' }, '会话设置'))

  const tglPin = el('div', { class: 'gi-toggle is-on' })
  tglPin.appendChild(icon('star'))
  tglPin.appendChild(el('span', { class: 'gi-tlabel' }, '置顶在 Rail'))
  tglPin.appendChild(el('div', { class: 'gi-switch' }))
  tglPin.addEventListener('click', () => {
    tglPin.classList.toggle('is-on')
    showToast(tglPin.classList.contains('is-on') ? '已置顶' : '已取消置顶')
  })
  body.appendChild(tglPin)

  const tglMute = el('div', { class: 'gi-toggle' })
  tglMute.appendChild(icon('bellOff'))
  tglMute.appendChild(el('span', { class: 'gi-tlabel' }, '消息免打扰'))
  tglMute.appendChild(el('div', { class: 'gi-switch' }))
  tglMute.addEventListener('click', () => {
    tglMute.classList.toggle('is-on')
    showToast(tglMute.classList.contains('is-on') ? '已免打扰' : '已恢复提醒')
  })
  body.appendChild(tglMute)

  // AI member group
  const aiGrp = memberGroup('AI 伙伴', 2, [
    { av: 'ai', letter: '🦞', name: '龙虾-分析师', role: 'scope:pr-review · 已接入', badge: 'Agent' },
    { av: 'ai', letter: 'T', name: 'Thomas AI', role: 'Claude · code-gen', badge: 'Agent' },
  ])
  body.appendChild(aiGrp)

  // Human members
  const humGrp = memberGroup('成员', 9, [
    { av: 'amber', letter: 'JL', name: 'JoeyLi2023', role: 'PM · Issue #249', owner: true },
    { av: 'teal', letter: '梦', name: '梦林', role: '后端 · Thread owner', online: true },
    { av: '', letter: '王', name: '王宜林', role: '前端', online: true },
    { av: 'coral', letter: '沙', name: '沙东惠', role: 'PM', online: true },
    { av: 'teal', letter: '张', name: '张兴朝', role: 'SRE', online: true },
    { av: 'amber', letter: 'AoLi', name: 'AoLi', role: '后端', online: true },
    { av: '', letter: '包', name: '包子', role: '后端 · 昨天活跃' },
    { av: 'teal', letter: 'L', name: 'Linda', role: 'QA · 3天前活跃' },
    { av: 'coral', letter: 'P', name: 'Peter', role: '设计 · 一周前活跃' },
  ])
  body.appendChild(humGrp)

  body.appendChild(el('div', { class: 'gi-section' }, '操作'))
  body.appendChild(giAction('rename', '重命名群聊', 'edit'))
  body.appendChild(giAction('clear', '清空聊天记录', 'trash'))
  body.appendChild(giAction('leave', '退出该群聊', 'logout', true))

  d.appendChild(body)
  return d
}

function memberGroup(label, count, members) {
  const g = el('div', { class: 'mem-group is-open' })
  const hd = el('button', { class: 'mem-hd', onclick: () => g.classList.toggle('is-open') })
  const caret = svg('0 0 24 24', '<polyline points="9 18 15 12 9 6"/>')
  caret.setAttribute('stroke-width', '2.5')
  caret.classList.add('caret')
  hd.appendChild(caret)
  hd.appendChild(el('span', { class: 'lbl' }, label))
  hd.appendChild(el('span', { class: 'cnt' }, String(count)))
  g.appendChild(hd)

  const bd = el('div', { class: 'mem-bd' })
  for (const m of members) {
    const row = el('div', { class: 'mem-row' })
    const av = el('div', { class: `av ${m.av || ''}` })
    av.appendChild(document.createTextNode(m.letter))
    if (m.online != null) {
      av.appendChild(el('span', { class: 'av-dot' + (m.online ? ' on' : '') }))
    }
    row.appendChild(av)
    const txt = el('div', { class: 'txt' })
    const nm = el('span', { class: 'nm' })
    nm.appendChild(document.createTextNode(m.name))
    if (m.badge) { nm.appendChild(document.createTextNode(' ')); nm.appendChild(el('span', { class: 'badge-ai' }, m.badge)) }
    if (m.owner) { nm.appendChild(document.createTextNode(' ')); nm.appendChild(el('span', { class: 'badge-owner' }, 'Owner')) }
    txt.appendChild(nm)
    txt.appendChild(el('span', { class: 'role' }, m.role))
    row.appendChild(txt)
    bd.appendChild(row)
  }
  g.appendChild(bd)
  return g
}

function giAction(key, label, ic, danger) {
  const b = el('button', {
    class: 'gi-action' + (danger ? ' is-danger' : ''),
    onclick: () => showToast(label + ' · 待实现'),
  })
  b.appendChild(icon(ic))
  b.appendChild(document.createTextNode(label))
  return b
}

/* ---- Contacts drawer（对齐 v7 drawerContacts）---- */
function buildContactsDrawer() {
  const d = el('div', { class: 'ov-drawer', id: 'drawerContacts' })
  const head = el('div', { class: 'ov-drawer-head' })
  const back = el('button', {
    class: 'ov-drawer-close', title: '返回',
    onclick: () => closeDrawer('drawerContacts'),
  })
  back.appendChild(svg('0 0 24 24', '<polyline points="15 18 9 12 15 6"/>'))
  head.appendChild(back)
  head.appendChild(el('div', { class: 'ov-drawer-title' }, '通讯录'))
  head.appendChild(el('button', {
    class: 'ov-drawer-textbtn',
    onclick: () => closeDrawer('drawerContacts'),
  }, '关闭'))
  d.appendChild(head)

  const search = el('div', { class: 'cd-search' })
  const sInput = el('div', { class: 'cd-input' })
  sInput.appendChild(icon('search'))
  sInput.appendChild(el('span', null, '搜索朋友、AI 伙伴…'))
  search.appendChild(sInput)
  const sAdd = el('button', { class: 'cd-add', title: '添加朋友 / 发起群聊' })
  sAdd.appendChild(icon('plus'))
  search.appendChild(sAdd)
  d.appendChild(search)

  const body = el('div', { class: 'ov-drawer-body', id: 'cdBody', style: { padding: '4px 0 12px', position: 'relative' } })

  // 新的朋友
  const newFriends = DEMO_CONTACTS?.newFriends || []
  if (newFriends.length > 0) {
    body.appendChild(el('div', { class: 'cd-section' }, `新的朋友 · ${newFriends.length}`))
    for (const f of newFriends) {
      const row = el('div', { class: 'cd-row', onclick: () => showToast('接受朋友 · 待实现') })
      row.appendChild(el('div', { class: 'av teal' }, (f.name || '?')[0]))
      const txt = el('div', { class: 'txt' })
      txt.appendChild(el('span', { class: 'nm' }, f.name))
      txt.appendChild(el('span', { class: 'sub' }, f.note || '想加你为朋友'))
      row.appendChild(txt)
      row.appendChild(el('span', { class: 'badge-new' }, '1'))
      body.appendChild(row)
    }
  }

  // AI 伙伴
  const friends = DEMO_CONTACTS?.friends || []
  const aiFriends = friends.filter((f) => f.isBot)
  if (aiFriends.length > 0) {
    body.appendChild(el('div', { class: 'cd-section' }, `AI 伙伴 · ${aiFriends.length}`))
    for (const f of aiFriends) {
      const row = el('div', {
        class: 'cd-row',
        onclick: () => {
          closeDrawer('drawerContacts')
          if (f.existingChannelId) selectThread(f.existingChannelId)
          else showToast('私信 AI · 待实现')
        },
      })
      row.appendChild(el('div', { class: 'av ai' }, (f.name || '?').replace(/-.*$/, '')[0]))
      const txt = el('div', { class: 'txt' })
      const nm = el('span', { class: 'nm' })
      nm.appendChild(document.createTextNode(f.name + ' '))
      nm.appendChild(el('span', { class: 'badge-ai-s' }, 'Agent'))
      txt.appendChild(nm)
      txt.appendChild(el('span', { class: 'sub' }, f.title || ''))
      row.appendChild(txt)
      body.appendChild(row)
    }
  }

  // 我的朋友 A-Z
  const humans = friends.filter((f) => !f.isBot)
  // Group by pinyin initial
  const byLetter = new Map()
  for (const f of humans) {
    const L = pinyinFirstLetter(f.name).toUpperCase()
    if (!byLetter.has(L)) byLetter.set(L, [])
    byLetter.get(L).push(f)
  }
  const letters = [...byLetter.keys()].sort()
  body.appendChild(el('div', { class: 'cd-section' }, `我的朋友 · ${humans.length}`))
  for (const L of letters) {
    body.appendChild(el('div', { class: 'cd-azhd' }, L))
    for (const f of byLetter.get(L)) {
      const row = el('div', {
        class: 'cd-row',
        onclick: () => {
          closeDrawer('drawerContacts')
          if (f.existingChannelId) selectThread(f.existingChannelId)
          else showToast('发起私聊 · 待实现')
        },
      })
      const avClass = f.online === false ? '' : 'teal'
      const av = el('div', { class: `av ${avClass}` })
      av.appendChild(document.createTextNode((f.name || '?')[0]))
      av.appendChild(el('span', { class: 'dot' + (f.online ? '' : ' offline') }))
      row.appendChild(av)
      const txt = el('div', { class: 'txt' })
      txt.appendChild(el('span', { class: 'nm' }, f.name))
      txt.appendChild(el('span', { class: 'sub' }, (f.title || '') + (f.online ? ' · 在线' : ' · 离线')))
      row.appendChild(txt)
      const chev = el('span', { class: 'chev' })
      chev.appendChild(icon('chevron'))
      row.appendChild(chev)
      body.appendChild(row)
    }
  }

  d.appendChild(body)

  // A-Z index strip
  const strip = el('div', { class: 'cd-index' })
  const allLetters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
  for (const L of allLetters) {
    const has = L === '#' ? (newFriends.length > 0 || aiFriends.length > 0) : letters.includes(L)
    const btn = el('button', {
      'data-letter': L,
      style: has ? null : { color: 'var(--wk-ink-12)', pointerEvents: 'none' },
      onclick: () => scrollToLetter(L),
    }, L)
    strip.appendChild(btn)
  }
  d.appendChild(strip)

  return d
}

function pinyinFirstLetter(name) {
  if (!name) return '#'
  const c = name.charAt(0)
  if (/[A-Za-z]/.test(c)) return c.toUpperCase()
  // Minimal CJK → pinyin初始字母 (只覆盖常用姓氏)
  const map = {
    '王': 'W', '李': 'L', '张': 'Z', '刘': 'L', '陈': 'C', '杨': 'Y', '赵': 'Z',
    '黄': 'H', '周': 'Z', '吴': 'W', '徐': 'X', '孙': 'S', '胡': 'H', '朱': 'Z',
    '高': 'G', '林': 'L', '何': 'H', '郭': 'G', '马': 'M', '罗': 'L', '梁': 'L',
    '宋': 'S', '郑': 'Z', '谢': 'X', '韩': 'H', '唐': 'T', '冯': 'F', '于': 'Y',
    '董': 'D', '萧': 'X', '程': 'C', '曹': 'C', '袁': 'Y', '邓': 'D', '许': 'X',
    '傅': 'F', '沈': 'S', '曾': 'Z', '彭': 'P', '吕': 'L', '苏': 'S', '卢': 'L',
    '蒋': 'J', '蔡': 'C', '贾': 'J', '丁': 'D', '魏': 'W', '薛': 'X', '叶': 'Y',
    '阎': 'Y', '余': 'Y', '潘': 'P', '杜': 'D', '戴': 'D', '夏': 'X', '钟': 'Z',
    '汪': 'W', '田': 'T', '任': 'R', '姜': 'J', '范': 'F', '方': 'F', '石': 'S',
    '姚': 'Y', '谭': 'T', '廖': 'L', '邹': 'Z', '熊': 'X', '金': 'J', '陆': 'L',
    '郝': 'H', '孔': 'K', '白': 'B', '崔': 'C', '康': 'K', '毛': 'M', '邱': 'Q',
    '秦': 'Q', '江': 'J', '史': 'S', '顾': 'G', '侯': 'H', '邵': 'S', '孟': 'M',
    '龙': 'L', '万': 'W', '段': 'D', '雷': 'L', '钱': 'Q', '汤': 'T', '尹': 'Y',
    '易': 'Y', '常': 'C', '武': 'W', '乔': 'Q', '贺': 'H', '赖': 'L', '龚': 'G',
    '文': 'W', '庞': 'P', '樊': 'F', '兰': 'L', '殷': 'Y', '施': 'S', '陶': 'T',
    '包': 'B', '梦': 'M', '沙': 'S',
  }
  return map[c] || '#'
}

function scrollToLetter(L) {
  const body = document.getElementById('cdBody')
  if (!body) return
  const head = [...body.querySelectorAll('.cd-azhd')].find((h) => h.textContent.trim() === L)
  if (head) body.scrollTo({ top: head.offsetTop - 8, behavior: 'smooth' })
  else body.scrollTo({ top: 0, behavior: 'smooth' })
}

function buildPicker() {
  const p = el('div', { class: 'ov-picker', id: 'ovPicker' })
  const head = el('div', { class: 'ov-picker-head' })
  const top = el('div', { class: 'ov-picker-topbar' })
  const searchBar = el('div', { class: 'ov-picker-search' })
  searchBar.appendChild(icon('search'))
  searchBar.appendChild(el('span', null, '搜索 Channel / Thread / 联系人'))
  top.appendChild(searchBar)
  const btnRefresh = el('button', { class: 'ov-picker-iconbtn', title: '刷新' })
  btnRefresh.appendChild(icon('refresh'))
  top.appendChild(btnRefresh)
  const btnAdd = el('button', { class: 'ov-picker-iconbtn', title: '新建' })
  btnAdd.appendChild(icon('plus'))
  top.appendChild(btnAdd)
  const btnClose = el('button', {
    class: 'ov-picker-close', title: '关闭',
    onclick: () => closePicker(),
  })
  btnClose.appendChild(icon('close'))
  top.appendChild(btnClose)
  head.appendChild(top)

  const tabs = el('div', { class: 'ov-picker-tabs' })
  const tabDefs = [['group', '群聊'], ['dm', '私聊']]
  for (const [id, label] of tabDefs) {
    const b = el('button', {
      class: id === 'group' ? 'is-active' : '',
      'data-tab': id,
      onclick: () => {
        tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('is-active', x.dataset.tab === id))
        renderPickerList(id)
      },
    })
    b.appendChild(document.createTextNode(label + ' '))
    const unread = tabUnreadCount(id)
    b.appendChild(el('span', { class: 'badge' }, String(unread || 0)))
    tabs.appendChild(b)
  }
  head.appendChild(tabs)
  p.appendChild(head)

  const list = el('div', { class: 'ov-picker-list', id: 'pickerList' })
  p.appendChild(list)
  return p
}

function tabUnreadCount(tab) {
  return state.threads
    .filter((t) => tab === 'dm' ? isPM(t) : !isPM(t))
    .reduce((a, t) => a + (t.unread || 0), 0)
}

/* Name → emoji/icon mapping（Figma 用 emoji 区分频道类型） */
function channelGlyph(t) {
  const raw = String(t.name || '').replace(/^[#\s]+/, '')
  if (/语音|voice/i.test(raw)) return '🎙'
  if (/前端|UI|画布/.test(raw)) return '🔥'
  if (/后端|架构|数据库/i.test(raw)) return '🎯'
  if (/设计|评审/.test(raw)) return '⚖️'
  if (/Octo|核心|整体/i.test(raw)) return '🐙'
  if (/Bug/i.test(raw)) return '🐛'
  if (/研究|research/i.test(raw)) return '🧪'
  if (/周会|讨论|会议/.test(raw)) return '💬'
  if (/产品|需求|PRD/i.test(raw)) return '📋'
  if (/移动|iOS|Android/i.test(raw)) return '📱'
  if (/Extension|原型/i.test(raw)) return '🧩'
  if (/品鉴|signal|schema/i.test(raw)) return '⭐'
  if (/记忆|memo|信息/i.test(raw)) return '🧠'
  if (/安全|security/i.test(raw)) return '🔒'
  if (/跨端|同步/.test(raw)) return '🔄'
  if (/Cmd|快捷/.test(raw)) return '⌘'
  if (/FT-A|Team/i.test(raw)) return '🚀'
  if (/高优|优先/.test(raw)) return '📌'
  if (/Archived|归档/i.test(raw)) return '📦'
  return '👥'
}

function openPicker() {
  const p = document.getElementById('ovPicker')
  p.classList.add('is-open')
  document.getElementById('ovBackdrop').classList.add('is-open')
  renderPickerList('group')
}
function closePicker() {
  document.getElementById('ovPicker').classList.remove('is-open')
  if (openOverlays.size === 0) document.getElementById('ovBackdrop').classList.remove('is-open')
}

function renderPickerList(tab) {
  const list = document.getElementById('pickerList')
  list.innerHTML = ''
  if (tab === 'group') {
    const cats = DEMO_CATEGORIES.slice().sort((a, b) => a.order - b.order)
    for (const cat of cats) {
      if (cat.archived) continue
      const ts = state.threads.filter((t) =>
        !isPM(t) && (t.categoryId === cat.id || (cat.id === 'cat-default' && !t.categoryId))
      )
      if (ts.length === 0) continue
      list.appendChild(buildTreeCat(cat.name, ts, true))
    }
  } else {
    const pms = state.threads.filter(isPM)
    list.appendChild(buildTreeCat('最近', pms, true, 'dm'))
  }
}

function buildTreeCat(name, threads, open, kind) {
  const wrap = el('div')
  const row = el('div', { class: 'tree-row' + (open ? ' is-open' : ''), 'data-depth': '0' })
  const tri = el('span', { class: 'tree-tri' })
  tri.appendChild(svg('0 0 8 8', IC.tri))
  row.appendChild(tri)
  row.appendChild(el('span', { class: 'tree-label' }, name))
  wrap.appendChild(row)

  const kids = el('div', { class: 'tree-kids' + (open ? ' is-open' : '') })
  // Parent channel (channelType 2 / 3) + its Thread children (channelType 5)
  const parents = threads.filter((t) => !t.parentChannelId)
  for (const parent of parents) {
    const childThreads = threads.filter((t) => t.parentChannelId === parent.channelId)
    kids.appendChild(buildTreeLeaf(parent, kind, childThreads))
  }
  // Also orphan children (parent not in scope) — add directly
  const orphans = threads.filter((t) => t.parentChannelId && !parents.find((p) => p.channelId === t.parentChannelId))
  for (const o of orphans) kids.appendChild(buildTreeLeaf(o, kind, []))
  wrap.appendChild(kids)

  row.addEventListener('click', () => {
    const o = row.classList.toggle('is-open')
    kids.classList.toggle('is-open', o)
  })
  return wrap
}

/** Threads visible by default per channel; rest behind 展开 N 个 Thread */
const THREADS_DEFAULT_VISIBLE = 2

function buildTreeLeaf(t, kind, childThreads) {
  const wrap = el('div')
  const row = el('div', {
    class: 'tree-row' + (state.currentId === t.channelId ? ' is-active' : ''),
    'data-depth': '1',
    onclick: (e) => {
      if (e.target.closest('.tree-tri')) return
      closePicker(); selectThread(t.channelId)
    },
  })
  const hasKids = (childThreads && childThreads.length > 0)
  const tri = el('span', { class: hasKids ? 'tree-tri' : 'tree-tri is-empty' })
  if (hasKids) tri.appendChild(svg('0 0 8 8', IC.tri))
  row.appendChild(tri)

  if (isPM(t)) {
    const ic = el('span', {
      class: 'tree-icon',
      style: { background: 'linear-gradient(135deg,#A78BFA,#7C5CFC)', color: '#fff', borderRadius: '50%', fontSize: '10px', fontWeight: '700', width: '20px', height: '20px' },
    }, threadLetter(t))
    row.appendChild(ic)
  } else {
    row.appendChild(el('span', { class: 'tree-icon emoji' }, channelGlyph(t)))
  }

  // @我 prefix for mentions
  if (mentionOf(t) > 0) {
    row.appendChild(el('span', { class: 'tree-mention-inline' }, '@我'))
  }

  row.appendChild(el('span', { class: 'tree-label' }, (t.name || '').replace(/^[#\s]+/, '')))

  if (state.pinned.has(t.channelId)) {
    row.appendChild(el('span', { class: 'tree-pin', title: '已固定' }, '📌'))
  }

  if (unreadOf(t) > 0) {
    row.appendChild(el('span', {
      class: 'tree-badge' + (state.currentId === t.channelId ? ' dim' : ''),
    }, String(unreadOf(t))))
  }

  wrap.appendChild(row)

  // Children (threads) with collapse/expand
  if (hasKids) {
    const kids = el('div', { class: 'tree-kids tree-nest is-open' })
    const defaultOpen = childThreads.slice(0, THREADS_DEFAULT_VISIBLE)
    const hidden = childThreads.slice(THREADS_DEFAULT_VISIBLE)

    for (const c of defaultOpen) kids.appendChild(renderThreadChild(c))
    let hiddenShown = false
    const foldBtn = hidden.length > 0 ? el('button', {
      class: 'tree-fold',
      onclick: (e) => {
        e.stopPropagation()
        hiddenShown = !hiddenShown
        // Rebuild hidden region
        foldBtn.querySelector('.txt').textContent = hiddenShown ? `收起 ${hidden.length} 个 Thread` : `展开 ${hidden.length} 个 Thread`
        const caret = foldBtn.querySelector('.caret')
        caret.style.transform = hiddenShown ? 'rotate(180deg)' : ''
        hidden.forEach((c, i) => {
          const existing = kids.querySelector(`[data-hidden-id="${c.channelId}"]`)
          if (hiddenShown && !existing) {
            const row = renderThreadChild(c)
            row.setAttribute('data-hidden-id', c.channelId)
            kids.insertBefore(row, foldBtn)
          } else if (!hiddenShown && existing) {
            existing.remove()
          }
        })
      },
    }) : null
    if (foldBtn) {
      const caret = svg('0 0 24 24', '<polyline points="6 9 12 15 18 9"/>')
      caret.style.transition = 'transform 160ms'
      caret.classList.add('caret')
      foldBtn.appendChild(caret)
      foldBtn.appendChild(el('span', { class: 'txt' }, `展开 ${hidden.length} 个 Thread`))
      const unreadHidden = hidden.reduce((a, c) => a + (c.unread || 0), 0)
      if (unreadHidden > 0) foldBtn.appendChild(el('span', { class: 'tree-badge' }, String(unreadHidden)))
      kids.appendChild(foldBtn)
    }
    wrap.appendChild(kids)

    // Toggle via triangle
    const tri = row.querySelector('.tree-tri')
    tri.addEventListener('click', (e) => {
      e.stopPropagation()
      const o = !kids.classList.contains('is-open')
      kids.classList.toggle('is-open', o)
      row.classList.toggle('is-open', o)
    })
    row.classList.add('is-open')
  }
  return wrap
}

function renderThreadChild(c) {
  const tr = el('div', {
    class: 'tree-row' + (state.currentId === c.channelId ? ' is-active' : ''),
    'data-depth': '2',
    onclick: () => { closePicker(); selectThread(c.channelId) },
  })
  tr.appendChild(el('span', { class: 'tree-tri is-empty' }))
  const ic = el('span', { class: 'tree-icon emoji' }, '🧵')
  tr.appendChild(ic)
  if (mentionOf(c) > 0) tr.appendChild(el('span', { class: 'tree-mention-inline' }, '@我'))
  tr.appendChild(el('span', { class: 'tree-label' }, (c.name || '').replace(/^[#\s]+/, '')))
  if (unreadOf(c) > 0) {
    tr.appendChild(el('span', { class: 'tree-badge' }, String(unreadOf(c))))
  }
  return tr
}

/* ---- Cmd+K v3（对齐 Octo Cmd+K v3.html 设计） ---- */
function buildCmdkOverlay() {
  const c = el('div', { class: 'ov-cmdk', id: 'ovCmdk', role: 'dialog' })

  // Top bar
  const top = el('div', { class: 'cmdk-top' })
  top.appendChild(el('div', { class: 'avatar' }, '✦'))
  const title = el('div', { class: 'title' })
  title.appendChild(document.createTextNode('发送到 '))
  title.appendChild(el('strong', null, 'Octo'))
  top.appendChild(title)
  top.appendChild(el('div', { class: 'spacer' }))

  const targetBtn = el('button', {
    class: 'target', id: 'cmdkTarget', type: 'button',
    title: '选择目标会话',
    onclick: () => showToast('目标选择器 · 待实现'),
  })
  targetBtn.appendChild(el('span', { class: 'glyph' }))
  targetBtn.appendChild(el('span', { class: 'ch', id: 'cmdkTargetCh' }, '未选择会话'))
  // thread-tag 可选
  targetBtn.appendChild(el('span', { class: 'thread-tag', id: 'cmdkTargetThread', hidden: '' }))
  const chev = svg('0 0 24 24', '<path d="M6 9l6 6 6-6"/>')
  targetBtn.appendChild(chev)
  top.appendChild(targetBtn)

  const closeBtn = el('button', {
    class: 'close', title: '关闭 (ESC)',
    onclick: () => closeCmdk(),
  })
  closeBtn.appendChild(icon('close'))
  top.appendChild(closeBtn)
  c.appendChild(top)

  // Quote
  const q = el('div', { class: 'cmdk-quote', id: 'cmdkQuote' })
  const qMeta = el('div', { class: 'q-meta' })
  qMeta.appendChild(el('span', { class: 'favicon' }, 'Gh'))
  qMeta.appendChild(el('span', { class: 'src', id: 'cmdkQuoteSrc' }, '当前页 · 选中 0 字符'))
  q.appendChild(qMeta)
  q.appendChild(el('div', { class: 'q-body', id: 'cmdkQuoteBody' },
    '从任意网页呼出 ⌘K，可把选中的内容 / 截图 / 图片快速转发到当前会话。'
  ))
  q.appendChild(el('button', { class: 'q-expand', onclick: () => showToast('展开原文 · 待实现') }, '展开'))
  c.appendChild(q)

  // Images strip
  const imgs = el('div', { class: 'cmdk-imgs', id: 'cmdkImgs' })
  // Demo pre-loaded images (可通过 state 动态控制，此处为 stub)
  const img1 = el('div', {
    class: 'img', style: { background: 'linear-gradient(135deg,#F7A27C 0%,#9D7CF7 100%)' },
    title: 'screenshot-1.png',
  })
  img1.appendChild(el('button', { class: 'x', onclick: (e) => { e.stopPropagation(); img1.remove() } }, '×'))
  const img2 = el('div', {
    class: 'img', style: { background: 'linear-gradient(135deg,#7CC7F7,#4EEAFF)' },
    title: 'screenshot-2.png',
  })
  img2.appendChild(el('button', { class: 'x', onclick: (e) => { e.stopPropagation(); img2.remove() } }, '×'))
  imgs.appendChild(img1)
  imgs.appendChild(img2)
  const addBtn = el('button', {
    class: 'add', title: '添加图片 (⌘I)',
    onclick: () => showToast('添加图片 · 待实现'),
  })
  addBtn.appendChild(icon('plus'))
  imgs.appendChild(addBtn)
  c.appendChild(imgs)

  // Input
  const inWrap = el('div', { class: 'cmdk-input-wrap' })
  const ta = el('textarea', {
    id: 'cmdkTa',
    placeholder: '告诉 Octo 你想怎么处理这段内容…',
  })
  ta.addEventListener('input', () => {
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
    const hasText = ta.value.trim().length > 0
    c.querySelector('.send-plane')?.classList.toggle('is-active', hasText || imgs.querySelectorAll('.img').length > 0)
  })
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submitCmdk()
    }
  })
  inWrap.appendChild(ta)
  c.appendChild(inWrap)

  // Footer
  const foot = el('div', { class: 'cmdk-foot' })
  const tools = el('div', { class: 'tools' })
  const t1 = el('button', { title: '提及 (@)', onclick: () => { ta.value += '@'; ta.focus(); ta.dispatchEvent(new Event('input')) } })
  t1.appendChild(icon('at'))
  const t2 = el('button', { title: '截图 (⌘⇧4)', onclick: () => showToast('截图 · 待实现') })
  t2.appendChild(svg('0 0 24 24', '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'))
  const t3 = el('button', { title: '附件 (⌘I)', onclick: () => showToast('附件 · 待实现') })
  t3.appendChild(icon('attach'))
  tools.appendChild(t1); tools.appendChild(t2); tools.appendChild(t3)
  foot.appendChild(tools)

  const hint = el('span', { class: 'hint' })
  const kbdEsc = el('span', { class: 'kbd' }, 'ESC')
  hint.appendChild(kbdEsc)
  hint.appendChild(document.createTextNode('关闭'))
  foot.appendChild(hint)

  const sendBtn = el('button', {
    class: 'send-plane is-active', title: '发送 (⌘↵)',
    onclick: submitCmdk,
  })
  sendBtn.appendChild(svg('0 0 24 24', '<path d="M3.5 11.5L20 4l-3.5 16.5-5-7z"/><path d="M11.5 13.5L20 4"/>'))
  foot.appendChild(sendBtn)
  c.appendChild(foot)

  return c
}

function refreshCmdkTarget() {
  const ch = document.getElementById('cmdkTargetCh')
  const tag = document.getElementById('cmdkTargetThread')
  if (!ch) return
  const cur = threadById(state.currentId)
  if (!cur) {
    ch.textContent = '未选择会话'
    tag.hidden = true
    return
  }
  const raw = (cur.name || '').replace(/^#\s*/, '')
  if (cur.parentChannelId) {
    const parent = threadById(cur.parentChannelId)
    ch.textContent = parent ? (parent.name || '').replace(/^#\s*/, '') : raw
    tag.textContent = `🧵 ${raw}`
    tag.hidden = false
  } else {
    ch.textContent = isPM(cur) ? cur.name : raw
    tag.hidden = true
  }
}

function submitCmdk() {
  const ta = document.getElementById('cmdkTa')
  const text = ta?.value.trim() || ''
  const t = threadById(state.currentId)
  closeCmdk()
  if (t && text) {
    const msgs = state.messagesByThread[t.channelId] || []
    msgs.push({
      id: `cmdk-${Date.now()}`, fromUid: DEMO_USER.uid, fromName: DEMO_USER.name,
      isBot: false, channelId: t.channelId, channelType: t.channelType,
      timestamp: Date.now(),
      payload: { type: 1, content: `> 引用：群聊和私聊混排，每条会话都展示头像 + 消息预览…\n\n${text}` },
    })
    state.messagesByThread[t.channelId] = msgs
    renderMessages(t)
  }
  showToast(text ? '已发送 · ' + text.slice(0, 20) : '已关闭')
  if (ta) ta.value = ''
}

function openCmdk() {
  const c = document.getElementById('ovCmdk')
  refreshCmdkTarget()
  c.classList.add('is-open')
  const bd = document.getElementById('ovBackdrop')
  bd.classList.add('is-open', 'is-cmdk')
  openOverlays.add('ovCmdk')
  setTimeout(() => document.getElementById('cmdkTa')?.focus(), 200)
}
function closeCmdk() {
  const c = document.getElementById('ovCmdk')
  c.classList.remove('is-open')
  openOverlays.delete('ovCmdk')
  const bd = document.getElementById('ovBackdrop')
  bd.classList.remove('is-cmdk')
  if (openOverlays.size === 0) bd.classList.remove('is-open')
}

/* ---- Fullscreen composer ---- */
function buildFullComposer() {
  const f = el('div', { class: 'ov-fullcomp', id: 'ovFullComp' })

  const head = el('div', { class: 'fc-head' })
  head.appendChild(el('div', { class: 'fc-head-title', id: 'fcTitle' }))
  const close = el('button', {
    class: 'fc-close', title: '关闭 (Esc)',
    onclick: () => closeFullComposer(true),
  })
  close.appendChild(icon('close'))
  head.appendChild(close)
  f.appendChild(head)

  const body = el('div', { class: 'fc-body' })
  const ta = el('textarea', {
    class: 'fc-ta', id: 'fcTa',
    placeholder: '写一段长消息…（Shift+Enter 换行，⌘+Enter 发送）',
  })
  body.appendChild(ta)
  body.appendChild(el('div', { class: 'fc-chips', id: 'fcChips' }))
  f.appendChild(body)

  const foot = el('div', { class: 'fc-foot' })
  const tools = el('div', { class: 'fc-tools' })
  const bEmoji = el('button', { title: '表情', onclick: () => showToast('表情选择器 · 待实现') })
  bEmoji.appendChild(icon('emoji'))
  const bAt = el('button', {
    title: '提及',
    onclick: () => { ta.value += '@'; ta.focus(); ta.dispatchEvent(new Event('input')) },
  })
  bAt.appendChild(icon('at'))
  const bAttach = el('button', { title: '附件', onclick: () => openAttachPicker() })
  bAttach.appendChild(icon('attach'))
  tools.appendChild(bEmoji); tools.appendChild(bAt); tools.appendChild(bAttach)
  foot.appendChild(tools)

  const hint = el('span', { class: 'fc-hint' })
  hint.appendChild(document.createTextNode('按 '))
  hint.appendChild(el('kbd', null, '⌘'))
  hint.appendChild(el('kbd', null, '↵'))
  hint.appendChild(document.createTextNode(' 发送 · '))
  hint.appendChild(el('kbd', null, 'Esc'))
  hint.appendChild(document.createTextNode(' 收起'))
  foot.appendChild(hint)

  const sendBtn = el('button', {
    class: 'fc-send', id: 'fcSend',
    onclick: () => submitFullComposer(),
    disabled: '',
  })
  sendBtn.appendChild(icon('send'))
  sendBtn.appendChild(document.createTextNode('发送'))
  foot.appendChild(sendBtn)
  f.appendChild(foot)

  ta.addEventListener('input', () => {
    sendBtn.disabled = ta.value.trim().length === 0 && composer.attachments.length === 0
  })
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submitFullComposer()
    }
  })
  return f
}

function openFullComposer() {
  const t = threadById(state.currentId)
  if (!t) { showToast('请先选一个会话'); return }
  const title = document.getElementById('fcTitle')
  title.innerHTML = ''
  if (isPM(t)) {
    title.appendChild(document.createTextNode(t.name))
  } else {
    title.appendChild(el('span', { class: 'hash' }, '#'))
    title.appendChild(document.createTextNode((t.name || '').replace(/^[#\s]+/, '')))
  }
  // Copy existing composer value over
  const ta = document.getElementById('fcTa')
  ta.value = composer.ta?.value || ''
  ta.dispatchEvent(new Event('input'))
  refreshFcChips()

  document.getElementById('ovFullComp').classList.add('is-open')
  openOverlays.add('ovFullComp')
  setTimeout(() => ta.focus(), 80)
}

function closeFullComposer(save) {
  if (save) {
    const ta = document.getElementById('fcTa')
    if (composer.ta) {
      composer.ta.value = ta.value
      composer.ta.dispatchEvent(new Event('input'))
    }
  }
  document.getElementById('ovFullComp').classList.remove('is-open')
  openOverlays.delete('ovFullComp')
}

function submitFullComposer() {
  const ta = document.getElementById('fcTa')
  if (composer.ta) {
    composer.ta.value = ta.value
    composer.ta.dispatchEvent(new Event('input'))
  }
  closeFullComposer(false)
  handleSend()
}

function refreshFcChips() {
  const chips = document.getElementById('fcChips')
  if (!chips) return
  chips.innerHTML = ''
  composer.attachments.forEach((att) => {
    const chip = el('div', { class: 'chip-file' })
    chip.appendChild(el('span', { class: 'fn' }, att.name))
    chips.appendChild(chip)
  })
}

function buildLightbox() {
  const lb = el('div', { class: 'ov-lightbox', id: 'ovLightbox' })
  const close = el('button', {
    class: 'ov-lightbox-close',
    onclick: () => { lb.classList.remove('is-open'); openOverlays.delete('ovLightbox') },
  })
  close.appendChild(icon('close'))
  lb.appendChild(close)
  lb.appendChild(el('div', { class: 'ov-lightbox-img' }, '[ 图片预览 · demo ]'))
  lb.appendChild(el('div', { class: 'ov-lightbox-meta' }))
  lb.addEventListener('click', (e) => {
    if (e.target === lb) { lb.classList.remove('is-open'); openOverlays.delete('ovLightbox') }
  })
  return lb
}

/* ============================================================
   Overlay state machine
   ============================================================ */
const openOverlays = new Set()
let openPopover = null

function positionPop(pop, left, top, width) {
  pop.style.position = 'absolute'
  pop.style.left = left + 'px'
  pop.style.top = top + 'px'
  if (width) pop.style.width = width + 'px'
  pop.style.right = 'auto'
  pop.style.bottom = 'auto'
}

function openPop(pop) {
  if (openPopover && openPopover !== pop) closePop(openPopover)
  pop.classList.add('is-open')
  openPopover = pop
}
function closePop(pop) {
  pop.classList.remove('is-open')
  if (openPopover === pop) openPopover = null
}
function closeAllPopovers() {
  document.querySelectorAll('.ov-pop.is-open').forEach((p) => p.classList.remove('is-open'))
  openPopover = null
}

function positionAboveAnchor(pop, anchor, width, prefer = 'above-right') {
  const extRect = ui.app.getBoundingClientRect()
  const aRect = anchor.getBoundingClientRect()
  const pw = width || (parseInt(pop.style.width, 10) || 240)
  pop.style.width = pw + 'px'
  // Render first so offsetHeight is valid
  pop.classList.add('is-open')
  const ph = pop.offsetHeight
  let left, top
  if (prefer === 'above-right') {
    left = aRect.right - extRect.left - pw
    top = aRect.top - extRect.top - ph - 4
  } else if (prefer === 'below-right') {
    left = aRect.right - extRect.left - pw
    top = aRect.bottom - extRect.top + 4
  } else if (prefer === 'right-of') {
    left = aRect.right - extRect.left + 6
    top = aRect.top - extRect.top
  } else {
    left = aRect.left - extRect.left
    top = aRect.top - extRect.top - ph - 4
  }
  left = clamp(left, 8, extRect.width - pw - 8)
  top = clamp(top, 8, extRect.height - ph - 8)
  positionPop(pop, left, top, pw)
}

function toggleSettingsPopover(anchor) {
  const p = document.getElementById('popSettings')
  if (p.classList.contains('is-open')) return closePop(p)
  syncSegs()
  positionAboveAnchor(p, anchor, 240, 'below-right')
  p._anchor = anchor
  openPop(p)
}

function toggleSearchPopover(anchor) {
  const p = document.getElementById('popSearch')
  if (p.classList.contains('is-open')) return closePop(p)
  positionAboveAnchor(p, anchor, 340, 'below-right')
  p._anchor = anchor
  openPop(p)
  setTimeout(() => document.getElementById('srInput')?.focus(), 60)
}

function toggleNewPopover(anchor) {
  const p = document.getElementById('popNew')
  if (p.classList.contains('is-open')) return closePop(p)
  positionAboveAnchor(p, anchor, 200, 'right-of')
  p._anchor = anchor
  openPop(p)
}

function openDrawer(id) {
  const d = document.getElementById(id)
  d.classList.add('is-open')
  openOverlays.add(id)
}
function closeDrawer(id) {
  const d = document.getElementById(id)
  d.classList.remove('is-open')
  openOverlays.delete(id)
}

/* ============================================================
   Toast
   ============================================================ */
let toastTimer = null
function showToast(msg) {
  const t = document.getElementById('ovToast')
  if (!t) return
  t.textContent = msg
  t.classList.add('is-open')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.remove('is-open'), 1400)
}

/* ============================================================
   Theme + layout control
   ============================================================ */
function setTheme(t) {
  state.theme = t
  document.body.setAttribute('data-theme', t)
  document.documentElement.dataset.theme = t
  storageSet({ [THEME_KEY]: t })
  syncSegs()
  showToast('主题 · ' + ({ paper: 'Paper', terminal: 'Terminal', moonwire: 'Moonwire' }[t]))
}
function setLayout(L) {
  state.layout = L
  document.body.setAttribute('data-layout', L)
  document.documentElement.dataset.layout = L
  storageSet({ [LAYOUT_KEY]: L })
  syncSegs()
  showToast('阅读模式 · ' + (L === 'message' ? '消息版' : 'CLI'))
}

function syncSegs() {
  const p = document.getElementById('popSettings')
  if (!p) return
  p.querySelectorAll('.ov-seg[data-role="theme"] button').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.v === state.theme)
  })
  p.querySelectorAll('.ov-seg[data-role="layout"] button').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.v === state.layout)
  })
}

/* ============================================================
   Thread selection
   ============================================================ */
function selectThread(id) {
  state.currentId = id
  storageSet({ [CURRENT_KEY]: id })
  // Clear unread locally (demo)
  const t = threadById(id)
  if (t) { t.unread = 0; t.mentionCount = 0 }
  renderRail()
  renderMain()
}

function savePinned() {
  storageSet({ [PINNED_KEY]: [...state.pinned] })
}

/* ============================================================
   Global key + click handlers
   ============================================================ */
function wireGlobalHandlers() {
  // backdrop click closes everything
  document.getElementById('ovBackdrop').addEventListener('click', () => {
    closeAllPopovers()
    closePicker()
    closeCmdk()
    openOverlays.forEach((id) => {
      if (id.startsWith('drawer')) closeDrawer(id)
    })
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Priority: popover → fullcomp → cmdk → picker → drawers
      if (openPopover) { closeAllPopovers(); return }
      if (openOverlays.has('ovFullComp')) { closeFullComposer(true); return }
      if (openOverlays.has('ovCmdk')) { closeCmdk(); return }
      closePicker()
      openOverlays.forEach((id) => { if (id.startsWith('drawer')) closeDrawer(id) })
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      openCmdk()
    }
  })

  // Click outside popover
  document.addEventListener('pointerdown', (e) => {
    if (!e.isTrusted) return
    if (openPopover && !openPopover.contains(e.target)) {
      const a = openPopover._anchor
      if (!a || !a.contains(e.target)) closePop(openPopover)
    }
  })
}

/* ============================================================
   Init
   ============================================================ */
async function boot() {
  const saved = await storageGet([THEME_KEY, LAYOUT_KEY, PINNED_KEY, CURRENT_KEY])
  state.theme = saved[THEME_KEY] || DEFAULT_THEME
  state.layout = saved[LAYOUT_KEY] || DEFAULT_LAYOUT
  state.pinned = new Set(Array.isArray(saved[PINNED_KEY]) ? saved[PINNED_KEY] : [])
  state.currentId = saved[CURRENT_KEY] || null

  document.body.setAttribute('data-theme', state.theme)
  document.body.setAttribute('data-layout', state.layout)
  document.documentElement.dataset.theme = state.theme
  document.documentElement.dataset.layout = state.layout

  // Auto-pick current if none
  if (!state.currentId && state.threads.length > 0) {
    const preferred = state.threads.find((t) => (t.unread || 0) > 0 || (t.mentionCount || 0) > 0)
    state.currentId = (preferred || state.threads[0]).channelId
    storageSet({ [CURRENT_KEY]: state.currentId })
  }

  mountShell()
  renderRail()
  renderMain()
  wireGlobalHandlers()
  syncSegs()
}

boot().catch((err) => {
  console.error('[octo v3] boot failed', err)
  app.textContent = '启动失败：' + (err?.message || err)
})
