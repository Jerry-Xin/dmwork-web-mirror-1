/**
 * Octo Extension — Content Script (lean)
 * 本文件只负责：
 *   1. Cmd+K 反馈浮层（截图 / 图片 / emoji / 附件）
 *   2. Toast
 *   3. Octo Web sessionStorage token 扫描
 *
 * Thread / 消息流 UI 都在 sidepanel/ 里，由 Chrome side_panel 原生管理（自动推挤网页）
 * 打开侧栏：工具栏 Octo 图标 / Chrome 原生侧栏按钮 / ⌘⇧O
 */
(function () {
  'use strict'

  // ============================================================
  // iframe 分支：只做 Cmd+K 事件转发，不 mount UI
  // （有些站点把编辑器放 iframe 里：Overleaf / Notion / Google Docs / Jira 等）
  // ============================================================
  const isTop = (() => { try { return window === window.top } catch { return false } })()
  if (!isTop) {
    window.addEventListener('keydown', (e) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && (e.key === 'k' || e.key === 'K')) {
        try {
          const sel = window.getSelection()
          const selection = sel ? sel.toString().trim() : ''
          window.top.postMessage({
            __octo: true,
            type: 'cmdk',
            selection,
            frameUrl: location.href,
            frameTitle: document.title,
          }, '*')
        } catch {}
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }, true)
    return
  }

  // 清理老的 host（扩展 reload 后的 orphan）
  const existing = document.getElementById('octo-extension-root')
  const hadOrphan = !!existing
  if (existing) { try { existing.remove() } catch {} }
  if (!chrome || !chrome.runtime || !chrome.runtime.id) {
    console.warn('[Octo] runtime invalid, content script aborting')
    return
  }

  // ============================================================
  // Constants
  // ============================================================
  const LIMITS = { SELECTION_PREVIEW: 500, TITLE_DISPLAY: 60, INPUT_MAX: 2000, MAX_ATTACHMENT_MB: 10 }
  const DEFAULT_BLACKLIST = ['accounts.google.com','accounts.youtube.com','login.microsoftonline.com','login.live.com','auth0.com','onepassword.com','lastpass.com','bitwarden.com']
  const DEFAULT_OCTO_WEB_DOMAINS = ['octo.botgate.cn','dmwork.botgate.cn','localhost']
  const COMMON_EMOJIS = ['👍','🎉','❤️','😊','😂','🤔','👀','🙌','🔥','💡','⭐','✅','❌','📝','🚀','🐙','🤖','👋','😍','🙏','💪','🎯','📌','⏰','💬','📊','🔗','📷','🧪','🦞']

  // ============================================================
  // Helpers
  // ============================================================
  function sendToBG(msg) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
          if (!res) return reject(new Error('no response'))
          if (!res.success) return reject(new Error(res.error || 'unknown'))
          resolve(res.data)
        })
      } catch (err) { reject(err) }
    })
  }

  function el(tag, attrs, children) {
    const n = document.createElement(tag)
    if (attrs) for (const k in attrs) {
      const v = attrs[k]
      if (v == null || v === false) continue
      if (k === 'class') n.className = v
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v)
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v)
      else if (k === 'html') n.innerHTML = v
      else if (k === 'value') n.value = v
      else if (k === 'disabled') { if (v) n.setAttribute('disabled', '') }
      else n.setAttribute(k, v)
    }
    if (children != null) {
      const list = Array.isArray(children) ? children : [children]
      for (const c of list) {
        if (c == null || c === false) continue
        if (c instanceof Node) n.appendChild(c)
        else n.appendChild(document.createTextNode(String(c)))
      }
    }
    return n
  }

  // URL → App 识别（content.js IIFE 内置版，和 shared/urlApps.js 保持同步）
  const URL_APPS = [
    { slug: 'overleaf', pattern: /overleaf\.(com|cn|io)/i,          name: 'Overleaf',    cli: 'overleaf-cli',   icon: '📝' },
    { slug: 'github',   pattern: /github\.com/i,                    name: 'GitHub',      cli: 'gh',             icon: '🐙' },
    { slug: 'gitlab',   pattern: /gitlab\.com/i,                    name: 'GitLab',      cli: 'glab',           icon: '🦊' },
    { slug: 'notion',   pattern: /notion\.(so|site)/i,              name: 'Notion',      cli: 'notion-cli',     icon: '📋' },
    { slug: 'feishu',   pattern: /feishu\.(cn|com)|larksuite\.com/i, name: '飞书',        cli: 'lark-cli',       icon: '🪶' },
    { slug: 'gdocs',    pattern: /docs\.google\.com/i,              name: 'Google Docs', cli: 'gdocs-cli',      icon: '📄' },
    { slug: 'figma',    pattern: /figma\.com/i,                     name: 'Figma',       cli: 'figma-cli',      icon: '🎨' },
    { slug: 'linear',   pattern: /linear\.app/i,                    name: 'Linear',      cli: 'linear-cli',     icon: '📊' },
    { slug: 'jira',     pattern: /\.atlassian\.net(?!.*wiki)/i,     name: 'Jira',        cli: 'jira-cli',       icon: '🎯' },
    { slug: 'confluence', pattern: /\.atlassian\.net\/wiki/i,       name: 'Confluence',  cli: 'confluence-cli', icon: '📚' },
    { slug: 'slack',    pattern: /slack\.com/i,                     name: 'Slack',       cli: 'slack-cli',      icon: '💬' },
    { slug: 'chatgpt',  pattern: /chat(gpt)?\.openai\.com|chatgpt\.com/i, name: 'ChatGPT', cli: null,            icon: '🤖' },
    { slug: 'claude',   pattern: /claude\.ai/i,                     name: 'Claude',      cli: null,             icon: '🔶' },
    { slug: 'gemini',   pattern: /gemini\.google/i,                 name: 'Gemini',      cli: null,             icon: '✨' },
    { slug: 'cursor',   pattern: /cursor\.(com|sh)/i,               name: 'Cursor',      cli: null,             icon: '⌨️' },
    { slug: 'youtube',  pattern: /youtube\.com|youtu\.be/i,         name: 'YouTube',     cli: null,             icon: '▶️' },
    { slug: 'twitter',  pattern: /(^|\.)twitter\.com|(^|\.)x\.com/i, name: 'X',          cli: null,             icon: '✖️' },
    { slug: 'wechat',   pattern: /mp\.weixin\.qq\.com/i,            name: '微信公众号',  cli: null,             icon: '💚' },
    { slug: 'zhihu',    pattern: /zhihu\.com/i,                     name: '知乎',        cli: null,             icon: '🫐' },
    { slug: 'stackoverflow', pattern: /stackoverflow\.com/i,        name: 'Stack Overflow', cli: null,          icon: '📚' },
  ]
  function resolveApp(url, host) {
    for (const app of URL_APPS) {
      if (app.pattern.test(host) || app.pattern.test(url)) {
        return { slug: app.slug, name: app.name, cli: app.cli, icon: app.icon, host }
      }
    }
    return { slug: 'generic', name: host || 'web', cli: null, icon: '🌐', host }
  }

  // 飞书风 outline icons — 和 sidepanel 保持同步
  const OUTLINE_ICONS = {
    emoji: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.5"/><circle cx="7.25" cy="8.25" r="0.5" fill="currentColor" stroke="none"/><circle cx="12.75" cy="8.25" r="0.5" fill="currentColor" stroke="none"/><path d="M7 12.4c.8 1.1 1.9 1.6 3 1.6s2.2-.5 3-1.6"/></svg>',
    mention: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="3"/><path d="M13 10v1.5a1.75 1.75 0 0 0 3.5 0V10a6.5 6.5 0 1 0-3 5.5"/></svg>',
    attach: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 5L7.75 10.75a2.12 2.12 0 0 0 3 3l6-6A4 4 0 0 0 11 2L4.5 8.5A6 6 0 0 0 13 17l4.25-4.25"/></svg>',
    camera: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5h2l1.2-2h7.6L15 6.5h2a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 17 17H3a1.5 1.5 0 0 1-1.5-1.5V8A1.5 1.5 0 0 1 3 6.5z"/><circle cx="10" cy="11.5" r="3"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11.5L20 4l-3.5 16.5-5-7z"/><path d="M11.5 13.5L20 4"/></svg>',
    close: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5l10 10M15 5L5 15"/></svg>',
    'chev-down': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l5 5 5-5"/></svg>',
    plus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v12M4 10h12"/></svg>',
    search: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="6"/><path d="M17 17l-3.5-3.5"/></svg>',
  }
  function outlineIcon(name, size) {
    const wrap = document.createElement('span')
    wrap.innerHTML = OUTLINE_ICONS[name] || ''
    const svg = wrap.querySelector('svg')
    if (svg && size) { svg.setAttribute('width', size); svg.setAttribute('height', size) }
    return svg || wrap
  }

  function captureSelectionContext() {
    const sel = window.getSelection()
    const selection = sel ? sel.toString().trim() : ''
    const url = location.href
    const title = document.title || url
    const hostname = location.hostname
    const iconLink = document.querySelector('link[rel~="icon"]')
    const favicon = iconLink ? iconLink.href : `${location.origin}/favicon.ico`
    const app = resolveApp(url, hostname)
    let pageType = 'generic'
    if (app.slug === 'github' || app.slug === 'gitlab') pageType = 'github'
    else if (['gdocs','notion','feishu','overleaf','confluence'].includes(app.slug)) pageType = 'doc'
    return { url, title, favicon, selection, pageType, hostname, app }
  }

  function isBlacklistedHost(host, patterns) {
    return (patterns || []).some((p) => {
      if (!p) return false
      if (p === host) return true
      if (p.includes('*')) {
        const re = new RegExp('^' + p.split('*').map((s) => s.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')).join('.*') + '$', 'i')
        return re.test(host)
      }
      return host.includes(p)
    })
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.onerror = reject
      r.readAsDataURL(file)
    })
  }

  function humanSize(bytes) {
    if (bytes < 1024) return bytes + 'B'
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB'
    return (bytes / 1024 / 1024).toFixed(1) + 'MB'
  }

  // ============================================================
  // State
  // ============================================================
  const state = {
    settings: {
      blacklist: DEFAULT_BLACKLIST.slice(),
      octoWebDomains: DEFAULT_OCTO_WEB_DOMAINS.slice(),
      demoMode: true,
    },
    cmdkCtx: null,
    toasts: [],
  }
  const renderers = []
  function register(fn) { renderers.push(fn) }
  function notify() { for (const r of renderers) { try { r(state) } catch (e) { console.warn(e) } } }
  function setState(patch) { Object.assign(state, patch); notify() }

  let toastId = 0
  function toast(text, kind = 'info') {
    const id = ++toastId
    setState({ toasts: state.toasts.concat([{ id, text, kind }]) })
    const dur = kind === 'error' ? 0 : kind === 'warning' ? 1500 : 2000
    if (dur > 0) setTimeout(() => setState({ toasts: state.toasts.filter((t) => t.id !== id) }), dur)
  }

  // ============================================================
  // Shadow host mount
  // ============================================================
  let shadow = null, root = null

  async function mountShadowHost() {
    const host = el('div', {
      id: 'octo-extension-root',
      'data-theme': 'paper',
      style: { all: 'initial', position: 'fixed', top: '0', left: '0', width: '0', height: '0', zIndex: '2147483646' },
    })
    document.body.appendChild(host)
    shadow = host.attachShadow({ mode: 'open' })
    try {
      const [tokens, contentCss] = await Promise.all([
        fetch(chrome.runtime.getURL('shared/tokens.css')).then((r) => r.text()),
        fetch(chrome.runtime.getURL('content/content.css')).then((r) => r.text()),
      ])
      const style = document.createElement('style')
      style.textContent = tokens + '\n' + contentCss
      shadow.appendChild(style)
    } catch (err) {
      console.warn('[Octo] failed to load styles', err)
    }
    root = el('div', { class: 'octo-root' })
    shadow.appendChild(root)
    try {
      const got = await new Promise((res) => chrome.storage.local.get(['octo_v3_theme'], res))
      const theme = got && got.octo_v3_theme
      if (theme && /^(paper|terminal|moonwire)$/.test(theme)) host.setAttribute('data-theme', theme)
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.octo_v3_theme) return
        const next = changes.octo_v3_theme.newValue
        if (next && /^(paper|terminal|moonwire)$/.test(next)) host.setAttribute('data-theme', next)
      })
    } catch {}
  }

  // ============================================================
  // Cmd+K overlay — 完整版：截图 / 图片粘贴+拖拽 / emoji / 附件 chip
  // ============================================================
  function mountCmdK() {
    let node = null
    let local = newLocal()
    let drag = null

    function newLocal() {
      return {
        threads: [],
        categories: [],
        targetId: null,
        text: '',
        attachments: [],
        q: '',
        pickerOpen: false,
        pickerExpandedCats: null,
        pickerExpandedChans: new Set(),
        emojiOpen: false,
        sending: false,
        err: null,
        ox: 0,
        oy: 0,
      }
    }

    register((s) => {
      if (s.cmdkCtx && !node) build(s)
      else if (!s.cmdkCtx && node) { node.remove(); node = null; local = newLocal() }
    })

    async function build(s) {
      node = el('div', { class: 'octo-cmdk', role: 'dialog' })
      root.appendChild(node)
      rebuild(s)
      try {
        const [threads, categories] = await Promise.all([
          sendToBG({ type: 'FETCH_THREADS' }).catch(() => []),
          sendToBG({ type: 'FETCH_CATEGORIES' }).catch(() => []),
        ])
        local.threads = threads || []
        local.categories = categories || []
        if (!local.targetId && local.threads.length) {
          // 默认选第一个非子区、非私聊的 Channel，其次选第一个
          const first = local.threads.find((t) => (t.channelType === 2 || t.channelType === 3) && !t.parentChannelId)
            || local.threads[0]
          if (first) local.targetId = first.channelId
        }
        rebuild(s)
      } catch (err) {
        local.err = `无法加载会话列表：${err.message}`
        rebuild(s)
      }
    }

    // 跨频道 @ 处理 —— 切换目标 Thread 时清理 @
    function handleThreadSwitch(oldId, newId) {
      if (oldId === newId || !local.text) return
      const mentions = local.text.match(/@\S+/g) || []
      if (mentions.length === 0) return
      // 保留正文 + 清空所有 @（因为无法确认成员）
      local.text = local.text.replace(/@\S+\s?/g, '').replace(/\s{2,}/g, ' ').trim()
      const n = mentions.length
      toast(`已切换频道，${n} 个 @ 已清空，请重新选择`, 'warning')
    }

    function rebuild(s) {
      if (!node) return
      const ctx = s.cmdkCtx
      if (!ctx) return
      node.innerHTML = ''

      const fullTitle = ctx.title || ''
      const title = fullTitle.length > LIMITS.TITLE_DISPLAY ? fullTitle.slice(0, LIMITS.TITLE_DISPLAY) + '…' : fullTitle
      const selFull = ctx.selection || ''
      const preview = selFull.length > LIMITS.SELECTION_PREVIEW ? selFull.slice(0, LIMITS.SELECTION_PREVIEW) + '…' : selFull
      const selCount = selFull.length
      const target = local.threads.find((t) => t.channelId === local.targetId) || local.threads[0] || null
      const appIcon = (ctx.app && ctx.app.icon) || '🌐'
      const appShort = (ctx.app && ctx.app.name) || ctx.hostname || 'web'
      const favBg = (ctx.app && ctx.app.color) || '#5865F2'
      const canSend = !local.sending && target && (local.text.trim() || local.attachments.length > 0)

      const panel = el('div', { class: 'octo-cmdk-panel' })

      // ============ p-top: avatar + title + target + close ============
      const pTop = el('div', { class: 'octo-cmdk-top', title: '按住可拖动浮层' })
      pTop.appendChild(el('span', { class: 'octo-cmdk-avatar' }, '✦'))
      pTop.appendChild(el('div', { class: 'octo-cmdk-title' }, [
        '发送到 ',
        el('strong', {}, 'Octo'),
      ]))
      pTop.appendChild(el('div', { class: 'octo-cmdk-spacer' }))

      // Target chip (now at top)
      const targetName = target
        ? (target.name || '').replace(/^#\s*/, '')
        : (local.threads.length ? '选择 Thread' : '加载中…')
      const isThread = target && (target.channelType === 5 || target.parentChannelId)
      const targetBtn = el('button', {
        class: 'octo-cmdk-target-btn', disabled: local.sending, type: 'button',
        title: '切换发送目标',
        onclick: (e) => {
          e.stopPropagation()
          local.pickerOpen = !local.pickerOpen
          rebuild(state)
        },
      })
      targetBtn.appendChild(el('span', { class: 'octo-cmdk-target-glyph' }))
      targetBtn.appendChild(el('span', { class: 'octo-cmdk-target-name' }, targetName))
      if (isThread) {
        targetBtn.appendChild(el('span', { class: 'octo-cmdk-target-thread' }, '🧵 Thread'))
      }
      const chev = el('span', { class: 'octo-cmdk-target-chev' })
      chev.appendChild(outlineIcon('chev-down', 12))
      targetBtn.appendChild(chev)
      pTop.appendChild(targetBtn)

      const closeBtn = el('button', {
        class: 'octo-cmdk-close', title: '关闭 (Esc)', type: 'button',
        onclick: () => setState({ cmdkCtx: null }),
      })
      closeBtn.appendChild(outlineIcon('close', 14))
      pTop.appendChild(closeBtn)
      panel.appendChild(pTop)

      // ============ quote (purple bar + meta + body + expand) ============
      if (preview) {
        const quote = el('div', { class: 'octo-cmdk-quote' })
        const meta = el('div', { class: 'octo-cmdk-q-meta' })
        const fav = el('span', { class: 'octo-cmdk-q-favicon', style: `background:${favBg}` }, appIcon)
        meta.appendChild(fav)
        meta.appendChild(el('span', { class: 'octo-cmdk-q-src' }, `${appShort} · ${title || appShort}`))
        meta.appendChild(el('span', { class: 'octo-cmdk-q-sep' }, '·'))
        meta.appendChild(el('span', { class: 'octo-cmdk-q-count' }, `选中 ${selCount} 字`))
        quote.appendChild(meta)
        quote.appendChild(el('div', { class: 'octo-cmdk-q-body' }, preview))
        if (selFull.length > LIMITS.SELECTION_PREVIEW) {
          quote.appendChild(el('button', {
            class: 'octo-cmdk-q-expand', type: 'button',
            onclick: () => {
              const qb = node.querySelector('.octo-cmdk-q-body')
              const btn = node.querySelector('.octo-cmdk-q-expand')
              if (!qb || !btn) return
              if (qb.classList.contains('is-expanded')) {
                qb.classList.remove('is-expanded')
                qb.textContent = preview
                btn.textContent = '展开'
              } else {
                qb.classList.add('is-expanded')
                qb.textContent = selFull
                btn.textContent = '收起'
              }
            },
          }, '展开'))
        }
        panel.appendChild(quote)
      }

      // ============ imgs (horizontal strip + add) ============
      const images = local.attachments.filter((a) => a.type === 'image')
      const others = local.attachments.filter((a) => a.type !== 'image')
      if (images.length > 0 || others.length === 0) {
        const imgs = el('div', { class: 'octo-cmdk-imgs' })
        images.forEach((att) => {
          const tile = el('div', { class: 'octo-cmdk-img', title: att.name || 'image' })
          tile.appendChild(el('img', { src: att.dataUrl, class: 'octo-cmdk-img-thumb', alt: att.name || '' }))
          tile.appendChild(el('button', {
            class: 'octo-cmdk-img-x', title: '移除', type: 'button',
            onclick: () => {
              const i = local.attachments.indexOf(att)
              if (i >= 0) local.attachments.splice(i, 1)
              rebuild(state)
            },
          }, '×'))
          imgs.appendChild(tile)
        })
        const add = el('button', {
          class: 'octo-cmdk-add', title: '添加图片 (⌘I)', type: 'button',
          onclick: openFilePicker, disabled: local.sending,
        })
        add.appendChild(outlineIcon('plus', 18))
        imgs.appendChild(add)
        panel.appendChild(imgs)
      }

      // Non-image attachments (files): keep existing chip layout but scoped
      if (others.length > 0) {
        const chips = el('div', { class: 'octo-cmdk-chips' })
        others.forEach((att) => {
          const chip = el('div', { class: 'octo-cmdk-chip' })
          chip.appendChild(el('span', { class: 'octo-cmdk-chip-icon' }, '📎'))
          chip.appendChild(el('div', { class: 'octo-cmdk-chip-meta' }, [
            el('div', { class: 'octo-cmdk-chip-name' }, att.name || 'attachment'),
            el('div', { class: 'octo-cmdk-chip-size' }, att.size ? humanSize(att.size) : (att.source || '')),
          ]))
          chip.appendChild(el('button', {
            class: 'octo-cmdk-chip-rm', title: '移除', type: 'button',
            onclick: () => {
              const i = local.attachments.indexOf(att)
              if (i >= 0) local.attachments.splice(i, 1)
              rebuild(state)
            },
          }, '×'))
          chips.appendChild(chip)
        })
        panel.appendChild(chips)
      }

      // ============ p-input: textarea ============
      const pInput = el('div', { class: 'octo-cmdk-input-wrap' })
      const ta = el('textarea', {
        class: 'octo-cmdk-input',
        placeholder: '告诉 Octo 你想怎么处理这段内容…',
        rows: '3',
        disabled: local.sending,
      })
      ta.value = local.text
      ta.addEventListener('input', (e) => {
        local.text = e.target.value.slice(0, LIMITS.INPUT_MAX)
        ta.style.height = 'auto'
        ta.style.height = Math.min(ta.scrollHeight, 220) + 'px'
        const sendEl = node.querySelector('.octo-cmdk-send-plane')
        if (sendEl) sendEl.classList.toggle('is-active', !!(local.text.trim() || local.attachments.length) && !!target && !local.sending)
      })
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && (e.metaKey || e.ctrlKey || true)) {
          e.preventDefault(); submit()
        }
      })
      ta.addEventListener('paste', async (e) => {
        const items = e.clipboardData ? e.clipboardData.items : null
        if (!items) return
        for (const item of items) {
          if (item.type && item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              e.preventDefault()
              await addFile(file, 'paste')
              break
            }
          }
        }
      })
      pInput.appendChild(ta)
      panel.appendChild(pInput)

      // Emoji picker (folded)
      if (local.emojiOpen) {
        const grid = el('div', { class: 'octo-cmdk-emojis' })
        COMMON_EMOJIS.forEach(em => {
          grid.appendChild(el('button', {
            class: 'octo-cmdk-emoji', type: 'button',
            onclick: () => {
              local.text = (local.text || '') + em
              local.emojiOpen = false
              rebuild(state)
              setTimeout(() => {
                const t = node.querySelector('.octo-cmdk-input')
                if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length) }
              }, 20)
            },
          }, em))
        })
        panel.appendChild(grid)
      }

      // ============ p-foot: tools + hint + send-plane ============
      const pFoot = el('div', { class: 'octo-cmdk-foot' })
      if (local.err) pFoot.appendChild(el('span', { class: 'octo-cmdk-err' }, local.err))

      const tools = el('div', { class: 'octo-cmdk-tools' })
      const mentionT = el('button', {
        class: 'octo-cmdk-tool octo-cmdk-tool-mention', title: '@ 提及',
        disabled: local.sending, type: 'button',
        onclick: () => {
          const t = node.querySelector('.octo-cmdk-input')
          if (t) {
            const s0 = t.selectionStart ?? t.value.length
            const e0 = t.selectionEnd ?? t.value.length
            t.value = t.value.slice(0, s0) + '@' + t.value.slice(e0)
            t.setSelectionRange(s0 + 1, s0 + 1)
            local.text = t.value
            t.focus()
          }
        },
      })
      mentionT.appendChild(outlineIcon('mention', 18))
      const cameraT = el('button', {
        class: 'octo-cmdk-tool', title: '截图当前页 (⌘⇧4)',
        disabled: local.sending, type: 'button',
        onclick: captureScreenshot,
      })
      cameraT.appendChild(outlineIcon('camera', 18))
      const attachT = el('button', {
        class: 'octo-cmdk-tool', title: '附件（图片 / 文件）',
        disabled: local.sending, type: 'button',
        onclick: openFilePicker,
      })
      attachT.appendChild(outlineIcon('attach', 18))
      const emojiT = el('button', {
        class: `octo-cmdk-tool ${local.emojiOpen ? 'is-active' : ''}`,
        title: 'Emoji', disabled: local.sending, type: 'button',
        onclick: () => { local.emojiOpen = !local.emojiOpen; rebuild(state) },
      })
      emojiT.appendChild(outlineIcon('emoji', 18))
      tools.appendChild(mentionT)
      tools.appendChild(cameraT)
      tools.appendChild(attachT)
      tools.appendChild(emojiT)
      pFoot.appendChild(tools)

      const hint = el('div', { class: 'octo-cmdk-hint' }, [
        el('span', {}, [el('span', { class: 'octo-cmdk-kbd' }, 'ESC'), ' 关闭']),
      ])
      pFoot.appendChild(hint)

      const sendBtn = el('button', {
        class: `octo-cmdk-send-plane ${canSend ? 'is-active' : ''} ${local.sending ? 'is-sending' : ''}`,
        title: '发送 (Enter)', 'aria-label': '发送', type: 'button',
        onclick: submit,
        disabled: !canSend,
      })
      sendBtn.appendChild(outlineIcon('send', 18))
      pFoot.appendChild(sendBtn)

      panel.appendChild(pFoot)

      // Target Picker popover
      if (local.pickerOpen) panel.appendChild(buildPicker(s))

      if (local.ox || local.oy) {
        panel.style.transform = `translate(${local.ox}px, ${local.oy}px)`
      }

      node.appendChild(panel)
      bindDrag()
      bindDropZone(panel)
      if (!local.pickerOpen && !local.emojiOpen) {
        setTimeout(() => {
          ta.focus()
          ta.style.height = 'auto'
          ta.style.height = Math.min(ta.scrollHeight, 220) + 'px'
        }, 30)
      }
    }

    function buildPicker(s) {
      const wrap = el('div', { class: 'octo-cmdk-picker' })
      const inp = el('input', { class: 'octo-input-text', placeholder: '搜索 Channel / Thread / 联系人' })
      inp.value = local.q
      inp.addEventListener('input', (e) => { local.q = e.target.value; refillList() })
      wrap.appendChild(inp)
      const list = el('div', { class: 'octo-cmdk-picker-list' })
      wrap.appendChild(list)

      function selectTarget(channelId) {
        const oldId = local.targetId
        local.targetId = channelId
        local.pickerOpen = false
        handleThreadSwitch(oldId, channelId)
        rebuild(state)
      }

      function renderLeaf(t, level) {
        const isCurrent = t.channelId === local.targetId
        const isPrivate = t.channelType === 1
        const isThread = t.channelType === 5
        const icon = isPrivate ? (t.isBot ? '🤖' : (t.name || '?').slice(0, 1)) : (isThread ? '🧵' : '#')
        return el('button', {
          class: `octo-cmdk-picker-item octo-cmdk-pk-lvl-${level} ${isCurrent ? 'is-current' : ''} ${isPrivate ? 'is-pm' : ''}`,
          onclick: () => selectTarget(t.channelId),
        }, [
          el('span', { class: 'octo-cmdk-pk-icon' }, icon),
          el('span', { class: 'octo-cmdk-pk-name' }, (t.name || '').replace(/^#\s*/, '')),
          (t.mentionCount || 0) > 0 ? el('span', { class: 'octo-cmdk-pk-mention' }, '@') : null,
        ])
      }

      function refillList() {
        list.innerHTML = ''
        const key = local.q.trim().toLowerCase()

        // 搜索时扁平
        if (key) {
          const matched = local.threads.filter((t) => t.name.toLowerCase().includes(key))
          if (matched.length === 0) { list.appendChild(el('div', { class: 'octo-empty-small' }, '未找到')); return }
          for (const t of matched) list.appendChild(renderLeaf(t, 0))
          return
        }

        // 群聊树：Category 折叠 → Channel → Thread
        const channels = local.threads.filter((t) => (t.channelType === 2 || t.channelType === 3) && !t.parentChannelId)
        let cats = (local.categories || []).slice().sort((a, b) => (a.order || 99) - (b.order || 99))
        // 反推兜底：categories 为空时用 threads 的 categoryId
        if (cats.length === 0) {
          const seen = new Set()
          for (const ch of channels) {
            const cid = ch.categoryId || 'cat-default'
            if (!seen.has(cid)) { seen.add(cid); cats.push({ id: cid, name: cid === 'cat-default' ? '默认分组' : cid }) }
          }
        }
        const byCat = new Map()
        for (const cat of cats) byCat.set(cat.id, [])
        for (const ch of channels) {
          const cid = ch.categoryId || 'cat-default'
          if (!byCat.has(cid)) { byCat.set(cid, []); cats.push({ id: cid, name: cid === 'cat-default' ? '默认分组' : cid, order: 99 }) }
          byCat.get(cid).push(ch)
        }

        for (const cat of cats) {
          const catChannels = byCat.get(cat.id) || []
          if (catChannels.length === 0) continue
          const expanded = local.pickerExpandedCats == null ? true : local.pickerExpandedCats.has(cat.id)
          list.appendChild(el('button', {
            class: `octo-cmdk-pk-cat ${expanded ? 'is-expanded' : ''}`,
            onclick: () => {
              if (local.pickerExpandedCats == null) {
                local.pickerExpandedCats = new Set(cats.filter((c) => (byCat.get(c.id) || []).length > 0).map((c) => c.id))
              }
              if (local.pickerExpandedCats.has(cat.id)) local.pickerExpandedCats.delete(cat.id)
              else local.pickerExpandedCats.add(cat.id)
              refillList()
            },
          }, [
            el('span', { class: 'octo-cmdk-pk-arrow' }, expanded ? '▾' : '▸'),
            el('span', null, cat.name),
          ]))
          if (!expanded) continue
          for (const ch of catChannels) {
            list.appendChild(renderLeaf(ch, 1))
            const subs = local.threads.filter((t) => t.parentChannelId === ch.channelId).sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
            if (subs.length === 0) continue
            const expandedSubs = local.pickerExpandedChans.has(ch.channelId)
            const THREADS_VISIBLE = 2
            const visibleSubs = expandedSubs ? subs : subs.slice(0, THREADS_VISIBLE)
            for (const sub of visibleSubs) list.appendChild(renderLeaf(sub, 2))
            const extra = subs.length - visibleSubs.length
            if (extra > 0) {
              list.appendChild(el('button', {
                class: 'octo-cmdk-pk-more-subs',
                onclick: () => { local.pickerExpandedChans.add(ch.channelId); refillList() },
              }, `＋ ${extra} 个子区`))
            }
          }
        }

        // 私聊区
        const privates = local.threads.filter((t) => t.channelType === 1).sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
        if (privates.length > 0) {
          list.appendChild(el('div', { class: 'octo-cmdk-pk-cat-static' }, '私聊'))
          for (const t of privates) list.appendChild(renderLeaf(t, 1))
        }
      }
      refillList()
      setTimeout(() => inp.focus(), 30)
      return wrap
    }

    // ======== Attachment helpers ========
    async function addFile(file, source) {
      if (!file) return
      if (file.size > LIMITS.MAX_ATTACHMENT_MB * 1024 * 1024) {
        toast(`附件过大，不能超过 ${LIMITS.MAX_ATTACHMENT_MB}MB`, 'error')
        return
      }
      try {
        const dataUrl = await fileToDataUrl(file)
        const isImage = file.type && file.type.startsWith('image/')
        local.attachments.push({
          type: isImage ? 'image' : 'file',
          name: file.name || (isImage ? 'image.png' : 'file'),
          size: file.size,
          mime: file.type,
          dataUrl,
          source: source || 'pick',
        })
        rebuild(state)
      } catch (err) {
        toast(`读文件失败：${err.message}`, 'error')
      }
    }

    function openFilePicker() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*,*/*'
      input.multiple = true
      input.addEventListener('change', async () => {
        for (const f of input.files || []) await addFile(f, 'pick')
      })
      input.click()
    }

    async function captureScreenshot() {
      // 先隐藏浮层，让截图不包含自己
      const prevDisplay = node.style.display
      node.style.display = 'none'
      await new Promise((r) => setTimeout(r, 100))
      try {
        const res = await sendToBG({ type: 'CAPTURE_SCREENSHOT' })
        if (res && res.dataUrl) {
          local.attachments.push({
            type: 'image',
            name: `screenshot-${Date.now()}.png`,
            dataUrl: res.dataUrl,
            source: 'screenshot',
          })
          toast('截图已附加', 'success')
        }
      } catch (err) {
        toast(`截图失败：${err.message}`, 'error')
      } finally {
        node.style.display = prevDisplay
        rebuild(state)
      }
    }

    // ======== Drop zone ========
    function bindDropZone(panel) {
      panel.addEventListener('dragover', (e) => {
        if (e.dataTransfer && Array.from(e.dataTransfer.items).some(it => it.kind === 'file')) {
          e.preventDefault()
          panel.classList.add('is-dragover')
        }
      })
      panel.addEventListener('dragleave', (e) => {
        if (e.target === panel) panel.classList.remove('is-dragover')
      })
      panel.addEventListener('drop', async (e) => {
        e.preventDefault()
        panel.classList.remove('is-dragover')
        const files = e.dataTransfer ? Array.from(e.dataTransfer.files || []) : []
        for (const f of files) await addFile(f, 'drop')
      })
    }

    // ======== Drag panel ========
    function applyTransform() {
      const panel = node && node.querySelector('.octo-cmdk-panel')
      if (panel) panel.style.transform = `translate(${local.ox}px, ${local.oy}px)`
    }
    function bindDrag() {
      if (!node) return
      const source = node.querySelector('.octo-cmdk-top')
      if (!source) return
      source.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return
        const t = e.target
        if (t && (t.tagName === 'BUTTON' || t.tagName === 'INPUT')) return
        e.preventDefault()
        drag = { sx: e.clientX, sy: e.clientY, ox: local.ox, oy: local.oy }
        source.classList.add('is-dragging')
        const p = node.querySelector('.octo-cmdk-panel')
        if (p) p.classList.add('is-dragging')
        window.addEventListener('mousemove', onDragMove)
        window.addEventListener('mouseup', onDragUp)
      })
    }
    function onDragMove(e) {
      if (!drag) return
      local.ox = drag.ox + (e.clientX - drag.sx)
      local.oy = drag.oy + (e.clientY - drag.sy)
      applyTransform()
    }
    function onDragUp() {
      drag = null
      if (node) {
        const src = node.querySelector('.octo-cmdk-top')
        const p = node.querySelector('.octo-cmdk-panel')
        if (src) src.classList.remove('is-dragging')
        if (p) p.classList.remove('is-dragging')
      }
      window.removeEventListener('mousemove', onDragMove)
      window.removeEventListener('mouseup', onDragUp)
    }

    // ======== Submit ========
    async function submit() {
      const target = local.threads.find((t) => t.channelId === local.targetId) || local.threads[0] || null
      if (!target) { local.err = '没有可选的 Thread'; rebuild(state); return }
      if (!local.text.trim() && !local.attachments.length) { local.err = '请输入反馈或添加附件'; rebuild(state); return }
      local.sending = true; local.err = null; rebuild(state)
      try {
        await sendToBG({
          type: 'SEND_MESSAGE',
          payload: {
            channelId: target.channelId,
            channelType: target.channelType,
            text: local.text.trim(),
            context: state.cmdkCtx,
            attachments: local.attachments,
            source: 'cmdk',
          },
        })
        toast(`已发送到 ${target.name}`, 'success')
        setState({ cmdkCtx: null })
      } catch (e) {
        local.err = e && e.message ? e.message : '发送失败，点击重试'
        local.sending = false
        rebuild(state)
      }
    }
  }

  // ============================================================
  // Selection hint — 用户选中文字后显示小浮标，点击打开 Cmd+K
  // 目的：教不知道 ⌘K 快捷键的用户
  // ============================================================
  function mountSelectionHint() {
    let hintEl = null
    let debounceTimer = null
    let mouseIsDown = false

    function ensureHint() {
      if (hintEl) return hintEl
      hintEl = el('button', {
        class: 'octo-select-hint',
        title: '反馈给 Octo · 或按 ⌘K',
      })
      const svgNs = 'http://www.w3.org/2000/svg'
      const s = document.createElementNS(svgNs, 'svg')
      s.setAttribute('viewBox', '0 0 24 24')
      s.setAttribute('fill', 'none')
      s.innerHTML = '<path d="M12 3c-4 0-7 3-7 7 0 2.3 1.3 4.3 3.2 5.5l-0.7 2.6c-0.3 0.9 0.6 1.6 1.4 1.1l2.4-1.4c0.5 0.1 1.1 0.2 1.7 0.2 4 0 7-3 7-7s-3-8-8-8z" fill="currentColor"/>'
      hintEl.appendChild(s)
      hintEl.appendChild(el('span', { class: 'octo-select-hint-label' }, '反馈到 Octo'))
      hintEl.appendChild(el('span', { class: 'octo-select-hint-kbd' }, '⌘K'))

      // pointerdown 更早于 mousedown，防止选区在浏览器处理 click 前丢失
      hintEl.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        e.stopPropagation()
      })
      hintEl.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
      })
      hintEl.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        hideHint()
        openCmdK()
      })
      root.appendChild(hintEl)
      return hintEl
    }

    function showHint(rect) {
      const h = ensureHint()
      const w = 132, hgt = 28
      // 紧贴选区末尾：先尝试放在最后一行右侧同一水平线
      let top = rect.top + (rect.height - hgt) / 2
      let left = rect.right + 6
      // 右边放不下 → 放到选区下方，左对齐选区末尾
      if (left + w > window.innerWidth - 8) {
        left = Math.max(8, rect.right - w)
        top = rect.bottom + 4
      }
      if (left < 8) left = 8
      // 下方也放不下 → 放到选区上方
      if (top + hgt > window.innerHeight - 8) top = rect.top - hgt - 4
      if (top < 8) top = 8
      h.style.top = `${top}px`
      h.style.left = `${left}px`
      h.classList.add('is-visible')
    }

    function hideHint() {
      if (hintEl) hintEl.classList.remove('is-visible')
    }

    function checkSelection() {
      if (mouseIsDown) return
      const sel = window.getSelection()
      const text = sel ? sel.toString().trim() : ''
      if (!text || text.length < 1) { hideHint(); return }
      try {
        const range = sel.getRangeAt(0)
        const ac = range.commonAncestorContainer
        const acEl = ac.nodeType === 1 ? ac : ac.parentElement
        if (acEl && acEl.closest && acEl.closest('#octo-extension-root')) { hideHint(); return }
        // 多行选区：取最后一行的 rect，让胶囊紧跟文字末尾
        const rects = range.getClientRects()
        const rect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect()
        if (!rect || (rect.width === 0 && rect.height === 0)) { hideHint(); return }
        showHint(rect)
      } catch { hideHint() }
    }

    function schedule(delay) {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(checkSelection, delay)
    }

    // 跟踪鼠标按下状态，避免拖拽过程中闪烁
    document.addEventListener('mousedown', (e) => {
      mouseIsDown = true
      // 点别处（非 hint）时隐藏
      if (hintEl && hintEl.classList.contains('is-visible') && !hintEl.contains(e.target)) {
        const t = e.target
        if (!(t && t.nodeType === 1 && t.closest && t.closest('#octo-extension-root'))) hideHint()
      }
    }, true)

    document.addEventListener('mouseup', (e) => {
      mouseIsDown = false
      const t = e.target
      if (t && t.nodeType === 1 && t.closest && t.closest('#octo-extension-root')) return
      schedule(60)
    }, true)

    // 键盘选区（Shift+Arrow / Cmd+A 等）
    document.addEventListener('keyup', (e) => {
      if (e.shiftKey || e.key === 'Shift' || (e.metaKey || e.ctrlKey)) schedule(60)
    }, true)

    // selectionchange 兜底：覆盖 mouseup 被页面 stopPropagation 的情况
    document.addEventListener('selectionchange', () => schedule(180))

    // 滚动 / resize 时隐藏
    window.addEventListener('scroll', hideHint, { passive: true, capture: true })
    window.addEventListener('resize', hideHint, { passive: true })

    window.__octoHideSelectHint = hideHint
  }

  // ============================================================
  // Toast stack
  // ============================================================
  function mountToast() {
    const stack = el('div', { class: 'octo-toast-stack' })
    root.appendChild(stack)
    register((s) => {
      stack.innerHTML = ''
      stack.style.display = s.toasts.length ? '' : 'none'
      for (const t of s.toasts) {
        stack.appendChild(el('div', { class: `octo-toast is-${t.kind}` }, [
          el('span', { class: 'octo-toast-text' }, t.text),
          el('button', {
            class: 'octo-toast-close',
            onclick: () => setState({ toasts: state.toasts.filter((x) => x.id !== t.id) }),
          }, '×'),
        ]))
      }
    })
  }

  // ============================================================
  // Actions
  // ============================================================
  function openCmdK(selOverride) {
    const ctx = captureSelectionContext()
    const selection = (selOverride != null && selOverride !== '') ? selOverride : ctx.selection
    if (!selection) {
      toast('请先选中要反馈的内容', 'warning')
      return
    }
    ctx.selection = selection
    // 打开浮层时把 selection hint 同步隐藏
    if (typeof window.__octoHideSelectHint === 'function') window.__octoHideSelectHint()
    setState({ cmdkCtx: ctx })
  }

  // ============================================================
  // Keybindings
  // ============================================================
  function bindKeys() {
    window.addEventListener('keydown', (e) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault(); e.stopImmediatePropagation(); openCmdK(); return
      }
      if (meta && e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault(); e.stopImmediatePropagation()
        sendToBG({ type: 'OPEN_SIDE_PANEL' }).catch((err) => {
          toast(`打开侧栏失败：${err.message}`, 'warning')
        })
        return
      }
      if (e.key === 'Escape') {
        if (state.cmdkCtx) { setState({ cmdkCtx: null }); return }
      }
    }, true)
  }

  // ============================================================
  // BG listener
  // ============================================================
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return
    if (msg.type === 'SETTINGS_UPDATED') {
      setState({ settings: msg.payload })
    } else if (msg.type === 'OPEN_CMDK') {
      openCmdK()
    }
  })

  // ============================================================
  // Cross-frame postMessage listener — 接收 iframe 里 Cmd+K 的转发
  // ============================================================
  window.addEventListener('message', (e) => {
    const d = e.data
    if (!d || d.__octo !== true) return
    if (d.type === 'cmdk') {
      openCmdK(d.selection || '')
    }
  })

  // ============================================================
  // Octo Web sessionStorage scanner
  // ============================================================
  async function scanAndReportWebToken() {
    try {
      const host = location.hostname
      const domains = state.settings.octoWebDomains || DEFAULT_OCTO_WEB_DOMAINS
      const matched = domains.some((d) => host === d || host.endsWith('.' + d))
      if (!matched) return
      let token = null, uid = null
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (!key) continue
        if (key.startsWith('token_')) {
          token = sessionStorage.getItem(key)
          uid = key.slice('token_'.length)
          if (token) break
        }
      }
      if (!token || !uid) return
      await sendToBG({ type: 'OCTO_WEB_TOKEN_FOUND', payload: { token, uid } })
      console.log('[Octo] synced token from web sessionStorage')
    } catch (err) {
      console.warn('[Octo] scanWebToken failed', err)
    }
  }

  // ============================================================
  // Boot
  // ============================================================
  async function boot() {
    if (!document.body) return
    try {
      const d = await sendToBG({ type: 'GET_AUTH' })
      if (d && d.settings) state.settings = Object.assign({}, state.settings, d.settings)

      if (isBlacklistedHost(location.hostname, state.settings.blacklist)) {
        console.log('[Octo] host blacklisted, skipping mount')
        return
      }

      await mountShadowHost()
      mountCmdK()
      mountToast()
      mountSelectionHint()
      bindKeys()
      notify()
      scanAndReportWebToken()

      if (hadOrphan) {
        // 老 content script 的 keydown listener 还挂在 window 上（从新脚本无法移除）
        // 会抢占 Cmd+K 事件。必须刷新页面才能彻底清掉。
        setTimeout(() => {
          toast('Octo 已更新 · 请按 ⌘R 刷新本页，Cmd+K 才会恢复', 'error')
        }, 600)
      }
    } catch (err) {
      console.warn('[Octo Content] boot failed', err)
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    boot()
  } else {
    window.addEventListener('DOMContentLoaded', boot, { once: true })
  }
})()
