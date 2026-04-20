import { DEFAULT_API_URL, DEFAULT_BLACKLIST, DEFAULT_OCTO_WEB_DOMAINS, DEFAULT_SETTINGS } from '../shared/constants.js'

const TABS = [
  { key: 'account', label: '账号', icon: '👤' },
  { key: 'appearance', label: '外观', icon: '🎨' },
  { key: 'privacy', label: '隐私', icon: '🔒' },
  { key: 'shortcuts', label: '快捷键', icon: '⌨️' },
  { key: 'about', label: '关于', icon: 'ℹ️' },
]

const navEl = document.getElementById('nav')
const mainEl = document.getElementById('main')
const bannerEl = document.getElementById('banner')

let currentTab = 'account'
let auth = null
let settings = Object.assign({}, DEFAULT_SETTINGS)
let isWelcome = location.hash === '#welcome'

function el(tag, attrs, children) {
  const n = document.createElement(tag)
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k]
      if (v == null || v === false) continue
      if (k === 'class') n.className = v
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v)
      else if (k === 'html') n.innerHTML = v
      else if (k === 'value') n.value = v
      else if (k === 'disabled') { if (v) n.setAttribute('disabled', '') }
      else if (k === 'checked') { if (v) n.setAttribute('checked', '') }
      else n.setAttribute(k, v)
    }
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

function sendToBG(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      if (!res) return reject(new Error('no response'))
      if (!res.success) return reject(new Error(res.error || 'unknown error'))
      resolve(res.data)
    })
  })
}

function flash(kind, text) {
  const banner = el('div', { class: `opt-banner is-${kind}` }, text)
  bannerEl.appendChild(banner)
  setTimeout(() => banner.remove(), 3000)
}

async function refresh() {
  try {
    const d = await sendToBG({ type: 'GET_AUTH' })
    auth = d && d.auth ? d.auth : null
    if (d && d.settings) settings = d.settings
  } catch (err) {
    console.warn('[Octo Options] refresh failed', err)
  }
  render()
}

async function saveSettings(patch) {
  try {
    const next = await sendToBG({ type: 'UPDATE_SETTINGS', payload: patch })
    settings = next
    flash('ok', '已保存')
    await refresh()
  } catch (err) {
    flash('err', err.message || '保存失败')
  }
}

async function handleLogout() {
  if (!confirm('确认退出登录？')) return
  try {
    await sendToBG({ type: 'CLEAR_AUTH' })
    auth = null
    flash('ok', '已退出登录')
    render()
  } catch (err) {
    flash('err', err.message || '退出失败')
  }
}

async function handleDemoReset() {
  if (!confirm('确认重置 Demo 数据？\n\n会清空你在 Demo 里发过的所有消息和 Agent 回复，初始示例会保留。')) return
  try {
    await sendToBG({ type: 'DEMO_RESET' })
    flash('ok', 'Demo 数据已重置')
  } catch (err) {
    flash('err', err.message || '重置失败')
  }
}

async function handleToggleDemo(enable) {
  const msg = enable
    ? '切换到 Demo 模式？\n\n将使用 mock 的 Thread 和消息，不连接真实后端。当前登录态会清除。'
    : '切换到真实模式？\n\n需要填写 API 地址和账号密码登录。Demo 数据会保留，下次切回来还能看到。'
  if (!confirm(msg)) return
  await saveSettings({ demoMode: enable })
}

function render() {
  navEl.innerHTML = ''
  for (const t of TABS) {
    navEl.appendChild(el('button', {
      class: `opt-menu-item ${currentTab === t.key ? 'is-active' : ''}`,
      onclick: () => { currentTab = t.key; render() },
    }, [el('span', null, t.icon), t.label]))
  }

  mainEl.innerHTML = ''
  if (isWelcome && currentTab === 'account') mainEl.appendChild(renderWelcome())
  if (currentTab === 'account') mainEl.appendChild(renderAccount())
  if (currentTab === 'appearance') mainEl.appendChild(renderAppearance())
  if (currentTab === 'privacy') mainEl.appendChild(renderPrivacy())
  if (currentTab === 'shortcuts') mainEl.appendChild(renderShortcuts())
  if (currentTab === 'about') mainEl.appendChild(renderAbout())
}

function renderWelcome() {
  return el('section', { class: 'opt-hero' }, [
    el('h1', null, '欢迎使用 Octo'),
    el('p', null, '品鉴遥控器已就位。默认进入 🧪 Demo 模式，你可以直接体验完整交互，不用登录。'),
    el('ul', null, [
      el('li', null, '🧪 Demo 模式：预置 6 个 Thread + 真实风格消息，发消息 2.5 秒后 Agent 自动回复'),
      el('li', null, '🐙 常驻侧边栏：浏览器右侧悬浮，随时打开 Thread'),
      el('li', null, '⌘ Cmd+K 反馈：选中网页内容，按 ⌘K 把信息丢给 Agent'),
      el('li', null, '💬 消息输入：在 Thread 里回复龙虾与同事'),
      el('li', null, '✅ 品鉴信号：对 Agent 产出一键打标（占位，待后端 schema）'),
    ]),
    el('p', { class: 'opt-hero-sub' }, '先到任意网页试试 → 右侧会有悬浮按钮'),
  ])
}

function renderModeBanner() {
  if (settings.demoMode) {
    return el('div', { class: 'opt-mode-banner is-demo' }, [
      el('div', { class: 'opt-mode-icon' }, '🧪'),
      el('div', { class: 'opt-mode-text' }, [
        el('div', { class: 'opt-mode-title' }, '当前：Demo 模式'),
        el('div', { class: 'opt-mode-sub' }, '使用 mock 数据展示完整交互，不连接真实后端。发送的消息只存在于本地，Agent 回复是 mock。'),
      ]),
      el('button', { class: 'opt-btn', onclick: () => handleToggleDemo(false) }, '切到真实模式'),
    ])
  }
  return el('div', { class: 'opt-mode-banner is-real' }, [
    el('div', { class: 'opt-mode-icon' }, '🌐'),
    el('div', { class: 'opt-mode-text' }, [
      el('div', { class: 'opt-mode-title' }, '当前：真实模式'),
      el('div', { class: 'opt-mode-sub' }, '连接你配置的 Octo 后端 API。'),
    ]),
    el('button', { class: 'opt-btn', onclick: () => handleToggleDemo(true) }, '切到 Demo'),
  ])
}

function renderAccount() {
  const wrap = el('section', { class: 'opt-section' }, [
    el('h2', null, '账号 & 模式'),
    renderModeBanner(),
  ])

  if (settings.demoMode) {
    wrap.appendChild(el('div', { class: 'opt-card opt-user-card' }, [
      el('div', { class: 'opt-avatar' }, '王'),
      el('div', { class: 'opt-user-info' }, [
        el('div', { class: 'opt-user-name' }, auth ? (auth.user.name || auth.user.uid) : '王宜林（Demo）'),
        el('div', { class: 'opt-user-uid' }, 'uid: demo-yilin'),
        el('div', { class: 'opt-user-uid' }, 'space: ft-a2-space'),
        el('div', { class: 'opt-user-uid' }, '6 个预置 Thread · 消息发送 2.5s 后 Agent 自动回复'),
      ]),
      el('button', { class: 'opt-btn opt-btn-danger', onclick: handleDemoReset }, '重置 Demo 数据'),
    ]))
    return wrap
  }

  if (auth) {
    wrap.appendChild(el('div', { class: 'opt-card opt-user-card' }, [
      el('div', { class: 'opt-avatar' }, (auth.user.name || auth.user.uid).slice(0, 1).toUpperCase()),
      el('div', { class: 'opt-user-info' }, [
        el('div', { class: 'opt-user-name' }, auth.user.name || auth.user.uid),
        el('div', { class: 'opt-user-uid' }, `uid: ${auth.user.uid}`),
        el('div', { class: 'opt-user-uid' }, `API: ${auth.apiUrl}`),
      ]),
      el('button', { class: 'opt-btn opt-btn-danger', onclick: handleLogout }, '退出登录'),
    ]))
    return wrap
  }

  const apiUrlInput = el('input', { class: 'opt-input', value: settings.apiUrl || DEFAULT_API_URL })
  const userInput = el('input', { class: 'opt-input', autocomplete: 'username' })
  const pwdInput = el('input', { class: 'opt-input', type: 'password', autocomplete: 'current-password' })
  const errSlot = el('div', { style: { display: 'none' } })
  const loginBtn = el('button', { class: 'opt-btn opt-btn-primary' }, '登录')
  const clearBtn = el('button', { class: 'opt-btn' }, '清空')

  async function doLogin() {
    errSlot.style.display = 'none'
    errSlot.textContent = ''
    loginBtn.setAttribute('disabled', '')
    loginBtn.textContent = '登录中…'
    try {
      await sendToBG({ type: 'LOGIN', payload: { username: userInput.value, password: pwdInput.value, apiUrl: apiUrlInput.value } })
      userInput.value = ''; pwdInput.value = ''
      flash('ok', '登录成功')
      await refresh()
    } catch (err) {
      errSlot.className = 'opt-err'
      errSlot.style.display = ''
      errSlot.textContent = err.message || '登录失败'
    } finally {
      loginBtn.removeAttribute('disabled')
      loginBtn.textContent = '登录'
    }
  }
  loginBtn.addEventListener('click', doLogin)
  clearBtn.addEventListener('click', () => { userInput.value = ''; pwdInput.value = ''; errSlot.style.display = 'none' })

  wrap.appendChild(el('h3', { style: { margin: '0 0 8px' } }, '登录 Octo'))
  wrap.appendChild(el('p', { class: 'opt-help', html: '优先推荐：在浏览器中登录 <b>Octo Web</b>，Extension 会自动读取登录态。如果 Web 未登录或域名不在白名单，下面用账密登录。' }))
  wrap.appendChild(el('div', { class: 'opt-card' }, [
    el('label', { class: 'opt-field' }, [
      el('span', null, 'API 地址'),
      apiUrlInput,
      el('small', { html: `例如 <code>${DEFAULT_API_URL}</code> 或本地 <code>http://localhost:8090/v1/</code>` }),
    ]),
    el('label', { class: 'opt-field' }, [el('span', null, '用户名'), userInput]),
    el('label', { class: 'opt-field' }, [el('span', null, '密码'), pwdInput]),
    errSlot,
    el('div', { class: 'opt-field-actions' }, [loginBtn, clearBtn]),
  ]))
  return wrap
}

function renderAppearance() {
  const sel = el('select', { class: 'opt-input', onchange: (e) => saveSettings({ theme: e.target.value }) }, [
    el('option', { value: 'auto' }, '跟随系统'),
    el('option', { value: 'light' }, '亮色'),
    el('option', { value: 'dark' }, '暗色'),
  ])
  sel.value = settings.theme

  const widthInput = el('input', {
    class: 'opt-input', type: 'number', min: 320, max: 960, value: settings.sidebarWidth,
    onchange: (e) => saveSettings({ sidebarWidth: Number(e.target.value) || 380 }),
  })

  return el('section', { class: 'opt-section' }, [
    el('h2', null, '外观'),
    el('div', { class: 'opt-card' }, [
      el('label', { class: 'opt-field' }, [el('span', null, '主题'), sel]),
      el('label', { class: 'opt-field' }, [el('span', null, '侧边栏默认宽度 (px)'), widthInput]),
    ]),
  ])
}

function renderPrivacy() {
  const blTa = el('textarea', { class: 'opt-input', rows: '6' })
  blTa.value = settings.blacklist.join('\n')
  blTa.addEventListener('blur', () => {
    saveSettings({ blacklist: blTa.value.split('\n').map((s) => s.trim()).filter(Boolean) })
  })

  const domTa = el('textarea', { class: 'opt-input', rows: '4' })
  domTa.value = settings.octoWebDomains.join('\n')
  domTa.addEventListener('blur', () => {
    saveSettings({ octoWebDomains: domTa.value.split('\n').map((s) => s.trim()).filter(Boolean) })
  })

  return el('section', { class: 'opt-section' }, [
    el('h2', null, '隐私'),
    el('div', { class: 'opt-card' }, [
      el('label', { class: 'opt-field' }, [
        el('span', null, '站点黑名单（一行一条，支持 *）'),
        blTa,
        el('small', { html: `黑名单站点不注入 Extension。默认预置：${DEFAULT_BLACKLIST.slice(0, 3).join(', ')} …` }),
      ]),
      el('label', { class: 'opt-field' }, [
        el('span', null, 'Octo Web 域名（用于自动同步登录态）'),
        domTa,
        el('small', { html: `默认：${DEFAULT_OCTO_WEB_DOMAINS.join(', ')}` }),
      ]),
    ]),
  ])
}

function renderShortcuts() {
  return el('section', { class: 'opt-section' }, [
    el('h2', null, '快捷键'),
    el('div', { class: 'opt-card' }, [
      el('div', { class: 'opt-kbd-row' }, [
        el('span', { class: 'opt-kbd-label' }, '唤起 Cmd+K 反馈浮层'),
        el('kbd', null, '⌘K'),
        el('span', { class: 'opt-kbd-desc' }, '在任意网页选中文本后触发'),
      ]),
      el('div', { class: 'opt-kbd-row' }, [
        el('span', { class: 'opt-kbd-label' }, '切换侧边栏'),
        el('kbd', null, '⌘⇧O'),
        el('span', { class: 'opt-kbd-desc' }, '展开 / 收起'),
      ]),
      el('div', { class: 'opt-kbd-row' }, [
        el('span', { class: 'opt-kbd-label' }, '关闭浮层 / 侧边栏'),
        el('kbd', null, 'Esc'),
        el('span', { class: 'opt-kbd-desc' }, '在浮层或侧边栏获得焦点时'),
      ]),
      el('p', { class: 'opt-help' }, '一期快捷键固定不可改，二期支持自定义。Windows / Linux 上的 ⌘ 对应 Ctrl。'),
    ]),
  ])
}

function renderAbout() {
  return el('section', { class: 'opt-section' }, [
    el('h2', null, '关于 Octo Extension'),
    el('div', { class: 'opt-card opt-about' }, [
      el('p', null, 'Octo 浏览器 Extension 是品鉴遥控器，让你在任意网页旁边唤起 Thread、把选中内容丢给 Agent，结果回到 Thread 品鉴。'),
      el('p', null, '这是 v0.1.0 零构建原型：原生 JS + ES module，直接加载目录即可运行，无需 npm/pnpm/vite。默认 Demo 模式，零登录体验完整交互。'),
      el('ul', null, [
        el('li', { html: '设计规范来自 <code>dmwork-web/packages/dmworkbase/src/theme/tokens.css</code>' }),
        el('li', { html: 'Cmd+K 桥接参考 <code>prototypes/octo-cmdk-extension</code>' }),
        el('li', { html: '后端 API 基于 <code>dmworkim</code> 的 <code>/v1/user/*</code>、<code>/v1/message/*</code>' }),
        el('li', { html: 'Demo 数据参考 FT-A2 开工指南 + 项目全景分析，人物和 Thread 名均取自真实语境' }),
      ]),
    ]),
  ])
}

refresh()
