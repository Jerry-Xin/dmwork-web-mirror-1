/**
 * URL → App 识别表
 * 前端拦截：Cmd+K 发送时，根据当前页 URL 解析出 app / cli，
 * 传给 Agent 让它知道用哪个 CLI 进行 CRUD。
 * 不经过后端，不改 IM 协议，只作为 message.payload.context.app 结构化字段。
 */

export const URL_APPS = [
  { slug: 'overleaf', pattern: /overleaf\.(com|cn|io)/i,          name: 'Overleaf',       cli: 'overleaf-cli',    icon: '📝' },
  { slug: 'github',   pattern: /github\.com/i,                    name: 'GitHub',         cli: 'gh',              icon: '🐙' },
  { slug: 'gitlab',   pattern: /gitlab\.com/i,                    name: 'GitLab',         cli: 'glab',            icon: '🦊' },
  { slug: 'notion',   pattern: /notion\.(so|site)/i,              name: 'Notion',         cli: 'notion-cli',      icon: '📋' },
  { slug: 'feishu',   pattern: /feishu\.(cn|com)|larksuite\.com/i, name: '飞书',           cli: 'lark-cli',        icon: '🪶' },
  { slug: 'gdocs',    pattern: /docs\.google\.com/i,              name: 'Google Docs',    cli: 'gdocs-cli',       icon: '📄' },
  { slug: 'figma',    pattern: /figma\.com/i,                     name: 'Figma',          cli: 'figma-cli',       icon: '🎨' },
  { slug: 'linear',   pattern: /linear\.app/i,                    name: 'Linear',         cli: 'linear-cli',      icon: '📊' },
  { slug: 'jira',     pattern: /\.atlassian\.net(?!.*wiki)/i,     name: 'Jira',           cli: 'jira-cli',        icon: '🎯' },
  { slug: 'confluence', pattern: /\.atlassian\.net\/wiki/i,       name: 'Confluence',     cli: 'confluence-cli',  icon: '📚' },
  { slug: 'slack',    pattern: /slack\.com/i,                     name: 'Slack',          cli: 'slack-cli',       icon: '💬' },
  { slug: 'discord',  pattern: /discord\.com/i,                   name: 'Discord',        cli: null,              icon: '🎮' },
  { slug: 'chatgpt',  pattern: /chat(gpt)?\.openai\.com|chatgpt\.com/i, name: 'ChatGPT',   cli: null,              icon: '🤖' },
  { slug: 'claude',   pattern: /claude\.ai/i,                     name: 'Claude',         cli: null,              icon: '🔶' },
  { slug: 'gemini',   pattern: /gemini\.google/i,                 name: 'Gemini',         cli: null,              icon: '✨' },
  { slug: 'cursor',   pattern: /cursor\.(com|sh)/i,               name: 'Cursor',         cli: null,              icon: '⌨️' },
  { slug: 'stackoverflow', pattern: /stackoverflow\.com/i,        name: 'Stack Overflow', cli: null,              icon: '📚' },
  { slug: 'youtube',  pattern: /youtube\.com|youtu\.be/i,         name: 'YouTube',        cli: null,              icon: '▶️' },
  { slug: 'twitter',  pattern: /(^|\.)twitter\.com|(^|\.)x\.com/i, name: 'X',             cli: null,              icon: '✖️' },
  { slug: 'medium',   pattern: /medium\.com/i,                    name: 'Medium',         cli: null,              icon: '📰' },
  { slug: 'hackernews', pattern: /news\.ycombinator\.com/i,       name: 'Hacker News',    cli: null,              icon: '🧡' },
  { slug: 'reddit',   pattern: /reddit\.com/i,                    name: 'Reddit',         cli: null,              icon: '👽' },
  { slug: 'wechat',   pattern: /mp\.weixin\.qq\.com/i,            name: '微信公众号',     cli: null,              icon: '💚' },
  { slug: 'zhihu',    pattern: /zhihu\.com/i,                     name: '知乎',           cli: null,              icon: '🫐' },
]

/**
 * 从 URL 解析出 app 信息。
 * 找不到 → 返回通用 generic（用 hostname 作为 name）。
 */
export function resolveApp(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname
    for (const app of URL_APPS) {
      if (app.pattern.test(host) || app.pattern.test(url)) {
        return { slug: app.slug, name: app.name, cli: app.cli, icon: app.icon, host }
      }
    }
    return { slug: 'generic', name: host, cli: null, icon: '🌐', host }
  } catch {
    return null
  }
}
