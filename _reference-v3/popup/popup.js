const rootEl = document.getElementById('root')

function el(tag, attrs, children) {
  const n = document.createElement(tag)
  if (attrs) for (const k in attrs) {
    const v = attrs[k]
    if (v == null) continue
    if (k === 'class') n.className = v
    else if (k === 'html') n.innerHTML = v
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v)
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v)
    else n.setAttribute(k, v)
  }
  if (children != null) {
    const list = Array.isArray(children) ? children : [children]
    for (const c of list) {
      if (c == null) continue
      n.appendChild(c instanceof Node ? c : document.createTextNode(String(c)))
    }
  }
  return n
}

function sendToBG(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      if (!res) return reject(new Error('no response'))
      if (!res.success) {
        const e = new Error(res.error || 'unknown error')
        e.code = res.code
        return reject(e)
      }
      resolve(res.data)
    })
  })
}

async function openSidePanelDirect() {
  // popup 里直接调 sidePanel API，用户 gesture 不会丢
  const current = await chrome.windows.getCurrent()
  await chrome.sidePanel.open({ windowId: current.id })
}

async function render() {
  let data = null
  try { data = await sendToBG({ type: 'GET_AUTH' }) } catch {}
  const auth = data && data.auth
  const settings = data && data.settings
  const isDemo = !!(settings && settings.demoMode)

  const header = el('header', { class: 'pop-header' }, [
    el('div', { class: 'pop-logo' }, '🐙'),
    el('div', { class: 'pop-title' }, 'Octo'),
    isDemo ? el('div', { class: 'pop-tag' }, '🧪 Demo') : null,
  ])

  const body = el('div', { class: 'pop-body' })

  if (auth) {
    body.appendChild(el('div', { class: 'pop-user' }, [
      el('div', { class: 'pop-avatar' }, (auth.user.name || auth.user.uid).slice(0, 1).toUpperCase()),
      el('div', null, [
        el('div', { class: 'pop-user-name' }, auth.user.name || auth.user.uid),
        el('div', { class: 'pop-muted' }, isDemo
          ? '当前：Demo 模式 · 零后端'
          : `已登录 · ${auth.apiUrl.replace(/^https?:\/\//, '')}`),
      ]),
    ]))

    const openBtn = el('button', { class: 'pop-btn pop-btn-primary' }, '打开 Octo 侧栏')
    openBtn.addEventListener('click', async () => {
      openBtn.setAttribute('disabled', '')
      openBtn.textContent = '打开中…'
      try {
        await openSidePanelDirect()
        window.close()
      } catch (err) {
        openBtn.removeAttribute('disabled')
        openBtn.textContent = '打开 Octo 侧栏'
        const errBox = el('div', {
          class: 'pop-err',
          style: { marginTop: '8px' },
        }, err?.message || '打开失败')
        body.appendChild(errBox)
      }
    })
    body.appendChild(openBtn)

    const hint = el('p', { class: 'pop-hint' })
    hint.innerHTML = '侧栏推挤网页 · 跨标签页持久 · <kbd>⌘K</kbd> 在任意网页选中文本反馈'
    body.appendChild(hint)

    body.appendChild(el('button', {
      class: 'pop-btn',
      onclick: () => { chrome.runtime.openOptionsPage(); window.close() },
    }, '打开设置'))
  } else {
    body.appendChild(el('div', { class: 'pop-muted' }, '未登录'))
    body.appendChild(el('button', {
      class: 'pop-btn pop-btn-primary',
      onclick: () => { chrome.runtime.openOptionsPage(); window.close() },
    }, '前往登录 / 开启 Demo'))
  }

  rootEl.innerHTML = ''
  rootEl.appendChild(el('div', { class: 'pop-root' }, [header, body]))
}

render()
