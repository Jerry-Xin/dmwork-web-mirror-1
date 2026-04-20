import { OctoApi } from './shared/api.js'
import {
  getAuth, setAuth, clearAuth,
  getSettings, setSettings,
  getCurrentThreadId, setCurrentThreadId,
} from './shared/storage.js'
import {
  DEMO_USER, DEMO_TOKEN, DEMO_THREADS, DEMO_BASE_MESSAGES, DEMO_CONTACTS, DEMO_CATEGORIES,
  getDemoRuntime, appendDemoMessage, clearDemoRuntime,
  getPendingReplies, addPendingReply, setPendingReplies,
  generateAgentReply,
} from './shared/demoData.js'

async function isDemoMode() {
  const s = await getSettings()
  return !!s.demoMode
}

async function getApi() {
  const auth = await getAuth()
  if (!auth) return null
  return new OctoApi(auth.apiUrl, auth.token)
}

function broadcastToTabs(msg) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) chrome.tabs.sendMessage(tab.id, msg).catch(() => {})
    }
  })
  // 同时发给 side panel / popup / options 等 extension pages
  chrome.runtime.sendMessage(msg).catch(() => {})
}

function isRestrictedUrl(url) {
  if (!url) return true
  if (/^(chrome|edge|about|chrome-extension|moz-extension|safari-web-extension):/i.test(url)) return true
  if (url.startsWith('file://')) return true
  if (url.includes('chrome.google.com/webstore')) return true
  if (url.includes('chromewebstore.google.com')) return true
  if (url === 'about:blank') return true
  return false
}

async function forwardToActiveTab(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || tab.id == null) throw new Error('没有找到活动标签页')
  if (isRestrictedUrl(tab.url)) {
    const err = new Error('当前是 Chrome 保留页（chrome://、扩展商店等），不支持 Octo。')
    err.code = 'RESTRICTED'
    throw err
  }
  try {
    await chrome.tabs.sendMessage(tab.id, msg)
    return
  } catch { /* inject & retry */ }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files: ['content/content.js'],
    })
  } catch (injErr) {
    const err = new Error(`无法注入：${injErr?.message || '未知'}。请刷新当前页面。`)
    err.code = 'INJECT_FAIL'
    err.tabId = tab.id
    throw err
  }
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, 250 + i * 250))
    try { await chrome.tabs.sendMessage(tab.id, msg); return } catch {}
  }
  const err = new Error('Content script 未就绪。请刷新当前页面后重试。')
  err.code = 'NOT_READY'
  err.tabId = tab.id
  throw err
}

async function injectContentIntoAllTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })
    await Promise.all(tabs.map(async (tab) => {
      if (tab.id == null) return
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: false },
          files: ['content/content.js'],
        })
      } catch {}
    }))
  } catch (err) {
    console.warn('[Octo BG] injectContentIntoAllTabs', err)
  }
}

// ============================================================
// Demo helpers
// ============================================================
async function ensureDemoAuth() {
  const current = await getAuth()
  if (current && current.user && current.user.uid === DEMO_USER.uid) return current
  await setAuth(DEMO_TOKEN, DEMO_USER)
  broadcastToTabs({ type: 'AUTH_SET', payload: { user: DEMO_USER } })
  return await getAuth()
}

async function demoFetchMessages(channelId, channelType) {
  await resolvePendingRepliesForChannel(channelId, channelType)
  const base = (DEMO_BASE_MESSAGES[channelId] || []).slice()
  const rt = await getDemoRuntime()
  const runtime = rt[channelId] || []
  return base.concat(runtime).sort((a, b) => a.timestamp - b.timestamp)
}

async function resolvePendingRepliesForChannel(channelId, channelType) {
  const all = await getPendingReplies()
  const now = Date.now()
  const due = []
  const remaining = []
  for (const p of all) {
    if (p.channelId === channelId && now >= p.replyAt) due.push(p)
    else remaining.push(p)
  }
  for (const p of due) {
    const botMsg = {
      id: `msg-demo-agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromUid: 'lobster',
      fromName: '龙虾-分析师',
      fromAvatar: null,
      isBot: true,
      channelId: p.channelId,
      channelType,
      timestamp: now,
      payload: { type: 1, content: generateAgentReply(p.userText, p.userCtx) },
    }
    await appendDemoMessage(p.channelId, botMsg)
  }
  if (due.length > 0) await setPendingReplies(remaining)
}

async function demoSendText(channelId, channelType, text, ctx, attachments) {
  // content 只放"选区引用 + 用户输入"，不拼完整 URL
  let content = text || ''
  if (ctx && ctx.selection) {
    const sel = ctx.selection.length > 500 ? ctx.selection.slice(0, 500) + '…' : ctx.selection
    const quoted = sel.split('\n').map((l) => `> ${l}`).join('\n')
    content = text ? `${quoted}\n\n${text}` : quoted
  }
  const payload = { type: 1, content }
  // URL / app 作为结构化 context 单独传 —— Agent 的 CLI 识别 + 前端来源 chip 用
  if (ctx) {
    payload.context = {
      url: ctx.url,
      title: ctx.title,
      hostname: ctx.hostname,
      pageType: ctx.pageType,
      favicon: ctx.favicon,
      app: ctx.app || null,
    }
  }
  if (attachments && attachments.length) payload.attachments = attachments

  const userMsg = {
    id: `msg-demo-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fromUid: DEMO_USER.uid,
    fromName: DEMO_USER.name,
    fromAvatar: null,
    isBot: false,
    channelId,
    channelType,
    timestamp: Date.now(),
    payload,
  }
  await appendDemoMessage(channelId, userMsg)
  await addPendingReply({
    channelId,
    channelType,
    replyAt: Date.now() + 2500,
    userText: text,
    userCtx: ctx || null,
    hadAttachments: !!(attachments && attachments.length),
  })
}

function formatWithContext(text, ctx) {
  const title = ctx.title.length > 60 ? ctx.title.slice(0, 60) + '…' : ctx.title
  const sel = ctx.selection.length > 500 ? ctx.selection.slice(0, 500) + '…' : ctx.selection
  const parts = [`[${title}](${ctx.url})`]
  if (sel) parts.push(sel.split('\n').map((l) => `> ${l}`).join('\n'))
  if (text) parts.push(text)
  return parts.join('\n\n').trim()
}

// ============================================================
// Side Panel opener
// ============================================================
async function openSidePanelForActive() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const windowId = tab && tab.windowId != null
    ? tab.windowId
    : (await chrome.windows.getCurrent()).id
  if (windowId == null) throw new Error('没有找到活动窗口')
  await chrome.sidePanel.open({ windowId })
}

// ============================================================
// Message router
// ============================================================
async function handleMessage(msg, sender) {
  try {
    const demo = await isDemoMode()

    switch (msg?.type) {
      case 'GET_AUTH': {
        if (demo) await ensureDemoAuth()
        const auth = await getAuth()
        const settings = await getSettings()
        return { success: true, data: { auth, settings } }
      }

      case 'CLEAR_AUTH': {
        await clearAuth()
        broadcastToTabs({ type: 'AUTH_CLEARED' })
        return { success: true }
      }

      case 'LOGIN': {
        const settings = await getSettings()
        const apiUrl = msg.payload.apiUrl ?? settings.apiUrl
        const tmpApi = new OctoApi(apiUrl, '')
        const { token, user } = await tmpApi.loginByUsername(msg.payload.username, msg.payload.password)
        await setAuth(token, user)
        if (apiUrl !== settings.apiUrl) await setSettings({ apiUrl })
        broadcastToTabs({ type: 'AUTH_SET', payload: { user } })
        return { success: true, data: { user } }
      }

      case 'OCTO_WEB_TOKEN_FOUND': {
        if (demo) return { success: true, data: { skipped: true } }
        const { token, uid } = msg.payload
        const current = await getAuth()
        if (current?.token === token) return { success: true, data: { alreadySet: true } }
        const user = current?.user && current.user.uid === uid ? current.user : { uid, name: uid }
        await setAuth(token, user)
        broadcastToTabs({ type: 'AUTH_SET', payload: { user } })
        return { success: true, data: { user } }
      }

      case 'FETCH_THREADS': {
        if (demo) {
          await ensureDemoAuth()
          return { success: true, data: DEMO_THREADS.slice() }
        }
        const api = await getApi()
        if (!api) return { success: false, error: '未登录' }
        const threads = await api.fetchThreads()
        return { success: true, data: threads }
      }

      case 'FETCH_CONTACTS': {
        if (demo) {
          await ensureDemoAuth()
          return { success: true, data: DEMO_CONTACTS }
        }
        return { success: true, data: { newFriends: [], friends: [] } }
      }

      case 'FETCH_CATEGORIES': {
        if (demo) {
          await ensureDemoAuth()
          return { success: true, data: DEMO_CATEGORIES.slice() }
        }
        return { success: true, data: [] }
      }

      case 'FETCH_MESSAGES': {
        if (demo) {
          const messages = await demoFetchMessages(msg.payload.channelId, msg.payload.channelType)
          return { success: true, data: messages }
        }
        const api = await getApi()
        if (!api) return { success: false, error: '未登录' }
        const messages = await api.fetchMessages(msg.payload.channelId, msg.payload.channelType, msg.payload.before)
        return { success: true, data: messages }
      }

      case 'SEND_MESSAGE': {
        const { channelId, channelType, text, context, attachments, source } = msg.payload
        if (demo) {
          await demoSendText(channelId, channelType, text, context, attachments)
          await setCurrentThreadId(channelId)
        } else {
          const api = await getApi()
          if (!api) return { success: false, error: '未登录' }
          // TODO: 真实模式下处理 attachments（需要先上传到 /v1/file/upload）
          await api.sendText(channelId, channelType, text, context)
          await setCurrentThreadId(channelId)
        }
        // 若来自 Cmd+K，通知 side panel 刷新
        if (source === 'cmdk') {
          broadcastToTabs({ type: 'MESSAGE_SENT_FROM_CMDK', payload: { channelId } })
        }
        return { success: true }
      }

      case 'GET_SETTINGS': {
        const settings = await getSettings()
        const currentThread = await getCurrentThreadId()
        return { success: true, data: { settings, currentThread } }
      }

      case 'UPDATE_SETTINGS': {
        const prev = await getSettings()
        const merged = await setSettings(msg.payload)
        if (prev.demoMode !== merged.demoMode) {
          await clearAuth()
          broadcastToTabs({ type: 'AUTH_CLEARED' })
        }
        broadcastToTabs({ type: 'SETTINGS_UPDATED', payload: merged })
        return { success: true, data: merged }
      }

      case 'DEMO_RESET': {
        await clearDemoRuntime()
        broadcastToTabs({ type: 'DEMO_RESET' })
        return { success: true }
      }

      case 'OPEN_SIDE_PANEL':
      case 'TOGGLE_SIDEBAR': {
        try {
          await openSidePanelForActive()
          return { success: true }
        } catch (err) {
          return { success: false, error: err?.message || '打开侧栏失败' }
        }
      }

      case 'CAPTURE_SCREENSHOT': {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (!tab || tab.windowId == null) throw new Error('找不到活动标签')
          if (isRestrictedUrl(tab.url)) throw new Error('当前页面不支持截图（Chrome 保留页）')
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png',
          })
          return { success: true, data: { dataUrl, url: tab.url, title: tab.title } }
        } catch (err) {
          return { success: false, error: err?.message || '截图失败' }
        }
      }

      case 'OPEN_CMDK':
        try {
          await forwardToActiveTab({ type: 'OPEN_CMDK' })
          return { success: true }
        } catch (err) {
          return { success: false, error: err?.message || '打开失败', code: err?.code, tabId: err?.tabId }
        }

      case 'RELOAD_ACTIVE_TAB': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id != null) await chrome.tabs.reload(tab.id)
        return { success: true }
      }

      default:
        return { success: false, error: `unknown type: ${msg?.type}` }
    }
  } catch (err) {
    console.error('[Octo BG]', msg?.type, err)
    return { success: false, error: err?.message ?? String(err) }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Fast path：OPEN_SIDE_PANEL 要保留用户手势链路，直接同步调用
  if (msg && (msg.type === 'OPEN_SIDE_PANEL' || msg.type === 'TOGGLE_SIDEBAR')) {
    openSidePanelForActive()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err?.message || '打开侧栏失败' }))
    return true
  }
  handleMessage(msg, sender)
    .then(sendResponse)
    .catch((err) => sendResponse({ success: false, error: err?.message ?? String(err) }))
  return true
})

chrome.runtime.onInstalled.addListener(async (details) => {
  // 允许 side panel 在每个页面打开
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  } catch {}
  await injectContentIntoAllTabs()
  if (details.reason === 'install') {
    await setSettings({ demoMode: true })
    await ensureDemoAuth()
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html#welcome') })
  }
})

chrome.runtime.onStartup.addListener(() => {
  injectContentIntoAllTabs()
})

chrome.alarms.create('octo-keepalive', { periodInMinutes: 0.5 })
chrome.alarms.onAlarm.addListener(() => {})

console.log('[Octo] Service Worker started · side panel ready')
