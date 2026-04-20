/**
 * Demo 数据 — 用 Octo 生态里真实的角色、Thread 名、Bot 名
 * 参考：dmwork-web (Thread 机制) / dmworkim (BotFather) / FT-A2 开工指南
 */

export const DEMO_USER = {
  uid: 'demo-yilin',
  name: '王宜林',
  avatar: null,
  spaceId: 'ft-a2-space',
}

export const DEMO_TOKEN = 'demo-token-octo-ft-a2'

const now = Date.now()
const min = 60 * 1000
const hour = 60 * min
const day = 24 * hour

// 群聊分组（Picker 群聊 Tab 下按此折叠）
export const DEMO_CATEGORIES = [
  { id: 'cat-important', name: '重要工作', order: 1 },
  { id: 'cat-regular',   name: '定期浏览', order: 2 },
  { id: 'cat-archived',  name: 'Archived', order: 98, archived: true },
  { id: 'cat-default',   name: '默认分组', order: 99 },
]

// ============================================================
// 群聊 Channel + 子区（Thread） + 私聊 混排
// - channelType 2 = 群聊 Channel / 3 = 项目频道
// - channelType 5 = Thread 子区（parentChannelId 指向父 Channel）
// - channelType 1 = 私聊（isBot 标识 AI）
// - categoryId：群聊所属分组；私聊不归属分组
// ============================================================
export const DEMO_THREADS = [
  // === 重要工作 ===
  {
    channelId: 'demo-ch-voice',
    channelType: 2,
    categoryId: 'cat-important',
    name: '# 语音转写策略讨论',
    lastMessageText: '转写 SLA 300ms 已达标',
    lastMessageTime: now - 8 * min,
    unread: 0,
  },
  {
    channelId: 'demo-thread-extension',
    channelType: 2,
    categoryId: 'cat-important',
    name: '# FT-A2 Team',
    lastMessageText: '今晚把 PRD 过一遍',
    lastMessageTime: now - 12 * min,
    unread: 1,
  },
  {
    channelId: 'demo-sub-fta2-high',
    channelType: 5,
    parentChannelId: 'demo-thread-extension',
    categoryId: 'cat-important',
    name: '高优先级问题',
    lastMessageText: '@王宜林 帮忙看下新的 tokens 是否对齐',
    lastMessageTime: now - 20 * min,
    unread: 1,
    mentionCount: 1,
  },
  {
    channelId: 'demo-sub-fta2-mobile',
    channelType: 5,
    parentChannelId: 'demo-thread-extension',
    categoryId: 'cat-important',
    name: '移动端相关',
    lastMessageText: 'iOS 端审核通过',
    lastMessageTime: now - 5 * hour,
    unread: 0,
  },
  {
    channelId: 'demo-sub-fta2-ext1',
    channelType: 5,
    parentChannelId: 'demo-thread-extension',
    categoryId: 'cat-important',
    name: 'Extension 原型',
    lastMessageText: '原型已提交评审',
    lastMessageTime: now - 12 * hour,
    unread: 0,
  },
  {
    channelId: 'demo-sub-fta2-ext2',
    channelType: 5,
    parentChannelId: 'demo-thread-extension',
    categoryId: 'cat-important',
    name: '品鉴信号 schema',
    lastMessageText: '已与 FT-A1 对齐',
    lastMessageTime: now - day,
    unread: 0,
  },
  {
    channelId: 'demo-sub-fta2-ext3',
    channelType: 5,
    parentChannelId: 'demo-thread-extension',
    categoryId: 'cat-important',
    name: 'Cmd+K 设计',
    lastMessageText: '三段式排版定稿',
    lastMessageTime: now - 2 * day,
    unread: 0,
  },
  {
    channelId: 'demo-ch-octo-core',
    channelType: 2,
    categoryId: 'cat-important',
    name: '# Octo 核心群',
    lastMessageText: '架构评审会纪要已发',
    lastMessageTime: now - 2 * hour,
    unread: 0,
  },
  {
    channelId: 'demo-sub-octo-safe',
    channelType: 5,
    parentChannelId: 'demo-ch-octo-core',
    categoryId: 'cat-important',
    name: '安全专区',
    lastMessageText: '认证方案已同步',
    lastMessageTime: now - 4 * hour,
    unread: 0,
  },
  {
    channelId: 'demo-sub-octo-memo',
    channelType: 5,
    parentChannelId: 'demo-ch-octo-core',
    categoryId: 'cat-important',
    name: '记忆与信息断裂',
    lastMessageText: '待 Mnemosyne 集成',
    lastMessageTime: now - 6 * hour,
    unread: 0,
  },
  {
    channelId: 'demo-sub-octo-more',
    channelType: 5,
    parentChannelId: 'demo-ch-octo-core',
    categoryId: 'cat-important',
    name: '跨端同步策略',
    lastMessageText: '草案 v2',
    lastMessageTime: now - day,
    unread: 0,
  },
  {
    channelId: 'demo-ch-frontend',
    channelType: 2,
    categoryId: 'cat-important',
    name: '# 前端 UI',
    lastMessageText: '组件库已更新',
    lastMessageTime: now - 6 * hour,
    unread: 0,
  },
  {
    channelId: 'demo-thread-research',
    channelType: 3,
    categoryId: 'cat-important',
    name: '# 研究频道 · Agent 产出汇总',
    lastMessageText: '本周 Agent 产出已汇总',
    lastMessageTime: now - 3 * hour,
    unread: 0,
  },
  // === 定期浏览 ===
  {
    channelId: 'demo-ch-bug',
    channelType: 2,
    categoryId: 'cat-regular',
    name: '# Bug 反馈',
    lastMessageText: '今日新增 3 个 P2 Bug',
    lastMessageTime: now - 40 * min,
    unread: 12,
  },
  {
    channelId: 'demo-ch-progress',
    channelType: 2,
    categoryId: 'cat-regular',
    name: '# Octo 整体进度同步群',
    lastMessageText: '本周迭代收官',
    lastMessageTime: now - 2 * hour,
    unread: 0,
  },
  {
    channelId: 'demo-ch-weekly',
    channelType: 2,
    categoryId: 'cat-regular',
    name: '# 产研周会讨论',
    lastMessageText: '下周议题：品鉴信号',
    lastMessageTime: now - day,
    unread: 0,
    muted: true,
  },
  // === Archived ===
  {
    channelId: 'demo-ch-archived',
    channelType: 2,
    categoryId: 'cat-archived',
    name: '# 内容电商博弈讨论',
    lastMessageText: '已归档',
    lastMessageTime: now - 30 * day,
    unread: 0,
  },
  // === 默认分组 ===
  {
    channelId: 'demo-thread-design',
    channelType: 2,
    categoryId: 'cat-default',
    name: '# 设计讨论',
    lastMessageText: '新 tokens 已上 Figma',
    lastMessageTime: now - 12 * hour,
    unread: 0,
  },
  {
    channelId: 'demo-thread-mengwhat',
    channelType: 2,
    categoryId: 'cat-default',
    name: '# DMWork Committer Sync',
    lastMessageText: 'Thread 后端 12 个端点全部 OK',
    lastMessageTime: now - 3 * day,
    unread: 0,
  },
  // === 私聊（channelType 1）不归属 category ===
  {
    channelId: 'demo-thread-lobster',
    channelType: 1,
    name: '龙虾-分析师',
    isBot: true,
    lastMessageText: '已完成网页摘要，请品鉴',
    lastMessageTime: now - 22 * min,
    unread: 1,
  },
  {
    channelId: 'demo-pm-metis',
    channelType: 1,
    name: 'Metis',
    isBot: true,
    lastMessageText: 'ADAC 的轮胎磨损测试。几个有意思的…',
    lastMessageTime: now - 35 * min,
    unread: 0,
  },
  {
    channelId: 'demo-pm-huige',
    channelType: 1,
    name: '吴明辉（辉哥）',
    isBot: false,
    lastMessageText: '嗯',
    lastMessageTime: now - 45 * min,
    unread: 0,
  },
  {
    channelId: 'demo-thread-botfather',
    channelType: 1,
    name: 'BotFather',
    isBot: true,
    lastMessageText: 'BotFather 可以帮你创建和管理机…',
    lastMessageTime: now - 2 * day,
    unread: 0,
  },
  {
    channelId: 'demo-pm-menglin',
    channelType: 1,
    name: '梦林',
    isBot: false,
    lastMessageText: '明天上午腾 1 小时对这个',
    lastMessageTime: now - 30 * min,
    unread: 0,
  },
  {
    channelId: 'demo-pm-aoli',
    channelType: 1,
    name: 'AoLi',
    isBot: true,
    lastMessageText: 'Thread PRD 今天更新',
    lastMessageTime: now - 2 * hour,
    unread: 0,
  },
  {
    channelId: 'demo-pm-yejia',
    channelType: 1,
    name: '叶佳',
    isBot: false,
    lastMessageText: '建议咱们可以提前准备',
    lastMessageTime: now - day,
    unread: 0,
  },
]

// 联系人 — 发起新对话（Rail 底部入口浮层展示）
export const DEMO_CONTACTS = {
  newFriends: [
    { uid: 'user-new-1', name: '周航', note: '来自 Octo 核心群' },
  ],
  friends: [
    { uid: 'menglin', name: '梦林',        title: '后端',         online: true,  existingChannelId: 'demo-pm-menglin' },
    { uid: 'yejia',   name: '叶佳',        title: '产品',         online: false },
    { uid: 'guobin',  name: 'guobin',      title: '后端',         online: true },
    { uid: 'aoli',    name: 'AoLi',        title: 'AI · 产品 PM', online: true, isBot: true, existingChannelId: 'demo-pm-aoli' },
    { uid: 'jojo',    name: 'JoJo',        title: 'AI · 运营',    online: true, isBot: true },
    { uid: 'lobster', name: '龙虾-分析师', title: 'AI · 分析',    online: true, isBot: true, existingChannelId: 'demo-thread-lobster' },
  ],
}

function mkMsg(id, channelId, channelType, fromUid, fromName, isBot, tsOffset, content) {
  return {
    id,
    fromUid,
    fromName,
    fromAvatar: null,
    isBot,
    channelId,
    channelType,
    timestamp: now - tsOffset,
    payload: { type: 1, content },
  }
}

export const DEMO_BASE_MESSAGES = {
  'demo-thread-extension': [
    mkMsg('ext-1', 'demo-thread-extension', 3, 'menglin', '梦林', false, 2 * hour,
      '刚看了 Extension 的 PRD v2。几个点想对齐：\n1. 品鉴信号 schema 走 reaction API 还是新 contentType？\n2. WebClip 卡片是这一期做还是下一期？'),
    mkMsg('ext-2', 'demo-thread-extension', 3, 'lobster', '龙虾-分析师', true, 110 * min,
      '根据 FT-A2 开工指南：\n- 品鉴信号属于"必须上线 S6"范畴，schema 需 FT-A1 对齐\n- WebClip 卡片 PRD 明确为下一期，一期走纯文本 + Markdown\n\n建议先跑通纯文本链路，再升级富卡片。'),
    mkMsg('ext-3', 'demo-thread-extension', 3, 'demo-yilin', '王宜林', false, 100 * min,
      '同意。下一步：\n1. 今晚把 PRD 过一遍\n2. 明天找梦林确认品鉴 schema'),
    mkMsg('ext-4', 'demo-thread-extension', 3, 'lobster', '龙虾-分析师', true, 90 * min,
      '已创建任务：\n- [ ] FT-A1 品鉴信号 schema 对齐（deadline：明天）\n- [ ] Extension 原型 UI 验证（今晚）\n\n要不要我帮你起草一份给 FT-A1 的同步模板？'),
    mkMsg('ext-5', 'demo-thread-extension', 3, 'demo-yilin', '王宜林', false, 85 * min,
      '好，起草一下'),
    mkMsg('ext-6', 'demo-thread-extension', 3, 'lobster', '龙虾-分析师', true, 80 * min,
      '已生成《Extension × FT-A1 对齐备忘》：\n- 品鉴信号 5 类（✅📝👋👁⭐）payload 字段\n- Octo Web 域名白名单\n- Token 存储加密策略\n\n已放进你的「Artifact · 待审」区。'),
    mkMsg('ext-7', 'demo-thread-extension', 3, 'menglin', '梦林', false, 12 * min,
      '收到。我明天上午腾出来 1 小时对这个。'),
    mkMsg('ext-8', 'demo-thread-extension', 3, 'demo-yilin', '王宜林', false, 8 * min,
      '今晚把 PRD 过一遍'),
  ],
  'demo-thread-lobster': [
    mkMsg('lob-1', 'demo-thread-lobster', 1, 'demo-yilin', '王宜林', false, 70 * min,
      '[dmwork-web README](https://github.com/dmwork-org/dmwork-web)\n\n> DMWork Web/PC 客户端，支持 Web、Mac、Windows、Linux 多平台。基于 React + TypeScript + Turborepo 构建的即时通讯前端。\n\n帮我看看这个仓库的整体架构'),
    mkMsg('lob-2', 'demo-thread-lobster', 1, 'lobster', '龙虾-分析师', true, 68 * min,
      '收到，正在分析…'),
    mkMsg('lob-3', 'demo-thread-lobster', 1, 'lobster', '龙虾-分析师', true, 22 * min,
      '已完成网页摘要：\n\n这是 Octo Web 前端仓库，核心信息：\n- React 18 + Vite 8 + Turborepo + pnpm 10\n- Semi UI + wukongimjssdk 1.3.5\n- monorepo 4 个 package：base / login / contacts / datasource\n- 24 种消息类型 Cell（TextCell/ImageCell/...）\n- Thread 已实现 7 个组件（ThreadPanel/ThreadList/...）\n\n建议关注：\n- `packages/dmworkbase/src/App.tsx`（WKApp 单例）\n- `packages/dmworkbase/src/Components/Conversation/vm.ts` 第 1284 行（发消息核心）\n- `packages/dmworkbase/src/theme/tokens.css`（设计变量，Extension 已同步）'),
  ],
  'demo-thread-research': [
    mkMsg('res-1', 'demo-thread-research', 3, 'lobster', '龙虾-分析师', true, 4 * hour,
      '本周 FT-A2 Agent 产出汇总：\n\n📦 后端（FT-A1）\n- Thread 12 个 REST 端点全部就绪，DM_THREAD_ON=true\n- BotFather /newbot 流程优化\n- Space 多租户中间件稳定运行\n\n🎨 设计（FT-A2）\n- Shell 重设计方案初稿（NavRail + 右栏按需预览）\n- tokens.css 新增 Dark Mode 变量\n- Extension 交互稿 v3（已验证 3 个模式）\n\n💻 前端（FT-A2）\n- Extension 原型 MVP\n- 消息类型注册机制整理\n- Tiptap 输入框预研'),
    mkMsg('res-2', 'demo-thread-research', 3, 'demo-yilin', '王宜林', false, 3 * hour,
      '把 Extension 原型进度拆细'),
    mkMsg('res-3', 'demo-thread-research', 3, 'lobster', '龙虾-分析师', true, 170 * min,
      'Extension 进度：\n1. ✅ 框架：Manifest V3 + 零构建原生 JS\n2. ✅ Cmd+K 浮层：capture 阶段拦截\n3. ✅ 侧边栏：Thread 切换 + 消息流\n4. ✅ 登录：双模式（Web sessionStorage + 账密）\n5. 🚧 品鉴信号：UI 占位，等后端 schema\n6. ⏳ WebClip 富卡片：下一期\n7. ⏳ WebSocket：二期替换轮询'),
  ],
  'demo-thread-design': [
    mkMsg('des-1', 'demo-thread-design', 2, 'designer-a', '设计师 A', false, 24 * hour,
      'tokens.css 更新：Dark Mode 的 bg-surface 调深了一档，对比度更好'),
    mkMsg('des-2', 'demo-thread-design', 2, 'demo-yilin', '王宜林', false, 13 * hour,
      '新 tokens 已上 Figma'),
  ],
  // @ 消息 · 挂在高优先级子区下
  'demo-sub-fta2-high': [
    mkMsg('sub-high-1', 'demo-sub-fta2-high', 5, 'designer-a', '设计师 A', false, 24 * hour,
      'tokens.css 更新：Dark Mode 的 bg-surface 调深了一档，对比度更好'),
    mkMsg('sub-high-2', 'demo-sub-fta2-high', 5, 'demo-yilin', '王宜林', false, 13 * hour,
      '新 tokens 已上 Figma'),
    mkMsg('sub-high-3', 'demo-sub-fta2-high', 5, 'designer-a', '设计师 A', false, 20 * min,
      '@王宜林 帮忙看下新的 tokens 是否对齐，尤其是 brand 色阶和阴影层级'),
  ],
  'demo-thread-botfather': [
    mkMsg('bf-1', 'demo-thread-botfather', 1, 'botfather', 'BotFather', true, 2 * day + hour,
      '你好！我是 BotFather，可以帮你创建和管理 Agent。\n\n可用命令：\n/newbot - 创建新的 Bot\n/mybots - 列出你的 Bot\n/token - 获取 Bot Token\n/setskill - 配置 Skill.md'),
    mkMsg('bf-2', 'demo-thread-botfather', 1, 'demo-yilin', '王宜林', false, 2 * day, '/mybots'),
    mkMsg('bf-3', 'demo-thread-botfather', 1, 'botfather', 'BotFather', true, 2 * day - min,
      '你当前的 Bot：\n\n🦞 龙虾-分析师 (lobster)\n   Token: ts_bot_xxxxx\n   Skill: https://lobster.octo.dev/skill.md\n\n🤖 Claude Code 适配器 (claude-code)\n   Token: ts_bot_yyyyy\n   Skill: https://claude.octo.dev/skill.md\n\n可以用 /newbot 创建新的 Agent'),
  ],
  'demo-thread-mengwhat': [
    mkMsg('cs-1', 'demo-thread-mengwhat', 2, 'menglin', '梦林', false, 3 * day + hour,
      'Thread 后端 12 个端点全部 OK，功能开关 DM_THREAD_ON=true\n\n端点清单：\n- POST /v1/groups/{group_no}/threads\n- GET  /v1/groups/{group_no}/threads\n- 创建/加入/离开/归档/解档/删除 全套'),
    mkMsg('cs-2', 'demo-thread-mengwhat', 2, 'demo-yilin', '王宜林', false, 3 * day, '赞'),
  ],
}

const STORAGE_KEY = 'octo_demo_runtime'
const PENDING_KEY = 'octo_demo_pending'

export async function getDemoRuntime() {
  const res = await chrome.storage.local.get(STORAGE_KEY)
  return res[STORAGE_KEY] || {}
}

export async function appendDemoMessage(channelId, message) {
  const rt = await getDemoRuntime()
  rt[channelId] = rt[channelId] || []
  rt[channelId].push(message)
  await chrome.storage.local.set({ [STORAGE_KEY]: rt })
}

export async function clearDemoRuntime() {
  await chrome.storage.local.remove([STORAGE_KEY, PENDING_KEY])
}

export async function getPendingReplies() {
  const res = await chrome.storage.local.get(PENDING_KEY)
  return res[PENDING_KEY] || []
}

export async function addPendingReply(reply) {
  const list = await getPendingReplies()
  list.push(reply)
  await chrome.storage.local.set({ [PENDING_KEY]: list })
}

export async function setPendingReplies(list) {
  await chrome.storage.local.set({ [PENDING_KEY]: list })
}

export function generateAgentReply(userText, ctx) {
  const intro = ctx
    ? `收到，已抓取页面：**${ctx.title.slice(0, 40)}**\n\n选中内容摘要：\n> ${ctx.selection.slice(0, 120)}${ctx.selection.length > 120 ? '…' : ''}\n\n`
    : ''

  const lower = userText.toLowerCase()
  let body = ''

  if (/总结|摘要|summarize|summary/.test(userText)) {
    body = '我来生成摘要：\n\n1. 核心要点提取中…\n2. 结合你之前的品鉴偏好\n3. 输出结构化结果\n\n（Demo 模式：这是 mock 回复，真实 Agent 会调 CLI 处理）'
  } else if (/分析|analyze|research/.test(userText)) {
    body = '开始分析：\n\n- 上下文扫描：完成\n- 关联文档检索：3 个候选\n- 初步判断：需要补充领域背景\n\n已放进 `Artifact · 分析报告`，可在右栏预览。'
  } else if (/翻译|translate/.test(userText)) {
    body = '翻译已完成（中英双向）：\n\n> （翻译结果预留位）\n\n是否需要保留原格式？回复 /preserve-format 确认。'
  } else if (/任务|todo|task/.test(userText)) {
    body = '已创建任务：\n- [ ] 基于当前 context 起草方案\n- [ ] 拉上 FT-A1 对齐\n- [ ] 下周五前交付初稿\n\n任务已同步到 Monitor，进度可见。'
  } else if (lower.includes('ok') || lower.includes('好')) {
    body = '👍 收到。我继续处理。有新产出会通过品鉴信号通知你。'
  } else {
    body = `收到你的请求：「${userText.slice(0, 80)}${userText.length > 80 ? '…' : ''}」\n\n正在执行：\n1. 解析意图 → 分类\n2. 调用相关 CLI 工具\n3. 结果回到 Thread\n\n（Demo 模式：这是 mock 回复。真实模式下会走 Agent Runtime 完成 CRUD。）`
  }

  return intro + body
}
