# CLAUDE.md — DMWork v4 编码规范

> 这份文档是给 AI agent（Claude Code、Codex 等）的强制约束。
> 所有代码改动必须遵守以下规则，不允许例外。

---

## 🚫 绝对禁止

### 硬编码颜色
```css
/* ❌ 禁止 */
color: #111318;
background: #7C5CFC;
border: 1px solid rgba(255,255,255,0.07);

/* ✅ 必须用变量 */
color: var(--wk-text-primary);
background: var(--wk-brand-primary);
border: 1px solid var(--wk-border-default);
```

### 硬编码间距
```css
/* ❌ 禁止 */
padding: 12px 16px;
margin-bottom: 24px;

/* ✅ 必须用变量 */
padding: var(--wk-sp-3) var(--wk-sp-4);
margin-bottom: var(--wk-sp-6);
```

### 硬编码圆角
```css
/* ❌ 禁止 */
border-radius: 10px;
border-radius: 20px;

/* ✅ 必须用变量 */
border-radius: var(--wk-r-md);
border-radius: var(--wk-r-xl);
```

### 自创颜色
不允许创建任何不在 `tokens.css` 里的颜色变量。需要新颜色时先更新 tokens.css。

---

## ✅ 必须遵守

### 引入 Token 文件
```css
/* 在组件 CSS 文件顶部，确认 tokens.css 已在全局加载 */
/* tokens.css 路径：packages/dmworkbase/src/theme/tokens.css */
```

### 颜色变量速查
| 用途 | 变量 |
|------|------|
| 品牌主色 | `--wk-brand-primary` (#7C5CFC) |
| 品牌渐变 | `--wk-brand-gradient` |
| 页面背景 | `--wk-bg-base` |
| 卡片背景 | `--wk-bg-surface` |
| 悬浮元素背景 | `--wk-bg-elevated` |
| hover 背景 | `--wk-bg-hover` |
| 主要文字 | `--wk-text-primary` |
| 次要文字 | `--wk-text-secondary` |
| 辅助文字 | `--wk-text-tertiary` |
| 强调文字 | `--wk-text-accent` |
| 默认边框 | `--wk-border-default` |
| 发光边框 | `--wk-border-glow` |
| AI 消息背景 | `--wk-ai-surface` |
| AI 消息边框 | `--wk-ai-border` |
| 成功色 | `--wk-color-success` |
| 警告色 | `--wk-color-warning` |
| 错误色 | `--wk-color-error` |
| 微妙边框 | `--wk-border-subtle` |
| 强调边框 | `--wk-border-strong` |
| AI 光晕 | `--wk-ai-glow` |
| 品牌柔和渐变 | `--wk-brand-gradient-subtle` |

### 间距档位（4px 栅格）
```
--wk-sp-1: 4px   --wk-sp-2: 8px    --wk-sp-3: 12px
--wk-sp-4: 16px  --wk-sp-5: 20px   --wk-sp-6: 24px
--wk-sp-8: 32px  --wk-sp-10: 40px  --wk-sp-12: 48px
```

### 圆角档位
```
--wk-r-xs: 4px    标签、badge
--wk-r-sm: 6px    小按钮、工具按钮
--wk-r-md: 10px   普通按钮、输入框、卡片
--wk-r-lg: 14px   大卡片、消息面板
--wk-r-xl: 20px   消息气泡、大容器
--wk-r-full: 9999px  圆形/胶囊
```

### 动效
```css
transition: all var(--wk-dur) var(--wk-ease);       /* 标准 */
transition: all var(--wk-dur-fast) var(--wk-ease);  /* 快速 hover */
```

---

## 组件开发规则

### 头像形状 — 身份规则（严格遵守）
```
人类用户  → border-radius: 50%（圆形）
AI Bot   → border-radius: var(--wk-r-sm)（小圆角方形）
群组     → border-radius: var(--wk-r-md)（中圆角方形）
```

### 消息气泡 vs AI 消息面板
```
人类消息（气泡）：
  - background: var(--wk-bg-elevated)
  - border-radius: 2px var(--wk-r-lg) var(--wk-r-lg) var(--wk-r-lg) （左上直角）
  - max-width: 480px
  - border: 1px solid var(--wk-border-subtle)

AI 消息（面板）：
  - background: var(--wk-bg-base)
  - border-radius: var(--wk-r-lg)（全圆角）
  - max-width: 680px（更宽）
  - border: 1px solid var(--wk-ai-border)（紫色调）
  - 顶部有渐变彩线（品牌签名）
  - hover: border-color 加深
```

### 输入框
```css
.input-box {
  border-radius: var(--wk-r-xl);  /* 大圆角 */
  border: 1px solid var(--wk-border-subtle);
  background: var(--wk-bg-elevated);
}
.input-box:focus-within {
  border-color: var(--wk-border-glow);
  box-shadow: 0 0 0 3px var(--wk-ai-glow);
}
/* AI 模式 */
.input-box.ai-mode {
  border-color: rgba(124,92,252,0.3);
  background: var(--wk-brand-gradient-subtle);
}
```

### 会话列表项
```css
.conv { border-radius: var(--wk-r-md); }
.conv:hover  { background: var(--wk-bg-hover); }
.conv.active { background: var(--wk-bg-elevated); }
/* active 左侧渐变指示条（必须有） */
.conv.active::before {
  width: 3px; height: 60%;
  background: var(--wk-brand-gradient);
}
```

### 搜索框
```css
.search-input {
  background: transparent;
  border: none;
  font: 400 15px var(--wk-font-sans);
  color: var(--wk-text-primary);
}
/* Tab 激活下划线用品牌渐变 */
.search-tab.active::after {
  background: var(--wk-brand-gradient);
}
```

### 按钮规则
```
主要操作按钮：background: var(--wk-brand-gradient)
次要按钮：background: transparent + border
工具按钮（小图标）：28×28px, border-radius: var(--wk-r-sm)
发送按钮：32×32px, border-radius: var(--wk-r-md), background: var(--wk-brand-gradient)
```

---

## Pre-commit 交叉 Review（必须执行）

### Commit 前流程

```bash
# 1. 生成 diff
bash scripts/review.sh

# 2. 用 Opus 子任务做交叉 review（Sonnet 写代码，Opus 来审）
# 子任务 prompt 模板：
# "Review the following diff for the dmwork-web project.
#  Check for: hardcoded colors/spacing/radius, !important abuse,
#  unrelated files mixed in, Semi Design token violations, dead code.
#  Output a numbered list of issues, severity (blocking/minor), and fix suggestion.
#  Diff: [paste /tmp/review-diff.txt content]"

# 3. 根据 Opus 反馈修复 blocking 问题

# 4. 确认 changed files 数量合理
git diff --stat origin/main...HEAD
# 如果改动超过预期文件数，停下来检查原因

# 5. 截图确认视觉没有回退
node scripts/debug.js screenshot
```

### 交叉 Review 要点
- **颜色**：是否有硬编码 hex/rgba（品牌区白色半透明除外）
- **间距/圆角**：是否用了 `--wk-sp-*` 和 `--wk-r-*` token
- **!important**：是否可以用更高优先级选择器替代
- **无关文件**：`.planning/`、`scripts/debug.js`、本地配置不能进 PR
- **Semi token**：颜色是否优先用 `--semi-color-*`

---

## 调试规则（必须执行）

### 每次修改 CSS/TSX 后
```bash
# 1. 截图确认整体效果
# debug.js 是本地开发工具，不在 repo 中
# 初始化方式见 ONBOARDING.md
node scripts/debug.js screenshot

# 2. 如有样式问题，inspect 具体元素
node scripts/debug.js inspect ".selector" --hover

# 3. 截图发给 Will 确认后再 commit
# 发送格式：MEDIA:/Users/soso/.openclaw/workspace/xxx.png
```

### Git 规范
```
分支格式：feat/sosoclaw/描述  fix/sosoclaw/描述
commit 前：git diff --stat 确认只有目标文件被改动
commit 语言：英文
```

---

## Dark Mode 要求

所有新组件必须同时支持 dark/light 两套主题。
使用 `--wk-*` 变量即自动支持，因为变量在 `[data-theme="dark"]` 和 `[data-theme="light"]` 下有不同值。
**禁止**写 `@media (prefers-color-scheme: dark)` 的单独覆盖——用变量解决。

---

## Semi Design 集成注意事项

- Semi Design token 已在 `tokens.css` 里对齐（`--semi-color-primary` 等）
- 修改 Semi 组件样式时，**只覆盖 token 变量**，不覆盖具体 class
- hover 颜色用 `color-mix()` 而非硬编码：
  ```css
  --semi-color-primary-hover: color-mix(in srgb, var(--wk-brand-primary) 85%, black);
  ```
- 需要加浏览器兼容 fallback：
  ```css
  --semi-color-primary-hover: #6B4FD8; /* fallback */
  --semi-color-primary-hover: color-mix(in srgb, var(--wk-brand-primary) 85%, black);
  ```
