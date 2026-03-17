# AGENTS.md — DMWork v4 编码规范

> 适用于所有 AI agent（Claude Code、Codex、Cursor、Windsurf 等）。
> 所有代码改动必须遵守以下规则。

---

## 🚫 绝对禁止

### 硬编码颜色
```css
/* ❌ 禁止 */
color: #111318;
background: #7C5CFC;
border: 1px solid rgba(255,255,255,0.07);

/* ✅ 用 Semi token（优先）或 wk token */
color: var(--semi-color-text-0);
background: var(--wk-brand-primary);
border: 1px solid var(--semi-color-border);
```

**例外**：品牌渐变背景上的半透明白色（如 `rgba(255,255,255,0.15)`）和 `color-mix()` 的浏览器兼容 fallback，属于合理的硬编码。

### 硬编码间距
```css
/* ❌ 禁止 */
padding: 12px 16px;

/* ✅ 必须用变量 */
padding: var(--wk-sp-3) var(--wk-sp-4);
```

### 硬编码圆角
```css
/* ❌ 禁止 */
border-radius: 10px;

/* ✅ 必须用变量 */
border-radius: var(--wk-r-md);
```

### 滥用 `!important`
用提高选择器优先级代替：
```css
/* ❌ */
.my-btn { height: 46px !important; }

/* ✅ */
.wk-login-panel .semi-button.my-btn { height: 46px; }
```

### 创建新颜色变量
需要新颜色时先更新 `packages/dmworkbase/src/theme/tokens.css`，不允许在组件里自创。

---

## ✅ Token 使用优先级

**颜色优先级：**
```
1. --semi-color-*  （Semi Design 系统色，自动 dark/light）
2. --wk-brand-*    （品牌色，渐变，Semi 没有对应的）
3. --wk-text-*     （文字色补充）
4. --wk-border-*   （边框色补充）
5. --wk-ai-*       （AI 专属色）
```

### 颜色速查
| 用途 | 推荐变量 |
|------|---------|
| 页面背景 | `--semi-color-bg-0` |
| 卡片/面板背景 | `--semi-color-bg-1` |
| 输入框背景 | `--semi-color-fill-0` |
| 主要文字 | `--semi-color-text-0` |
| 次要文字 | `--semi-color-text-1` |
| 辅助文字 | `--semi-color-text-2` |
| 边框 | `--semi-color-border` |
| 品牌主色 | `--wk-brand-primary` |
| 品牌渐变 | `--wk-brand-gradient` |
| 品牌柔和渐变 | `--wk-brand-gradient-subtle` |
| 品牌光晕 | `--wk-brand-glow` |
| hover 背景 | `--wk-bg-hover` |
| active 背景 | `--wk-bg-active` |
| 强调文字 | `--wk-text-accent` |
| 微妙边框 | `--wk-border-subtle` |
| 发光边框 | `--wk-border-glow` |
| 强调边框 | `--wk-border-strong` |
| AI 消息背景 | `--wk-ai-surface` |
| AI 消息边框 | `--wk-ai-border` |
| AI 光晕 | `--wk-ai-glow` |
| 成功 | `--wk-color-success` |
| 警告 | `--wk-color-warning` |
| 错误 | `--wk-color-error` |

### 间距档位（4px 栅格）
```
--wk-sp-1: 4px    --wk-sp-2: 8px    --wk-sp-3: 12px
--wk-sp-4: 16px   --wk-sp-5: 20px   --wk-sp-6: 24px
--wk-sp-8: 32px   --wk-sp-10: 40px  --wk-sp-12: 48px
```

### 圆角档位
```
--wk-r-xs: 4px      标签、badge
--wk-r-sm: 6px      小按钮、工具按钮
--wk-r-md: 10px     普通按钮、输入框、卡片
--wk-r-lg: 14px     大卡片、消息面板
--wk-r-xl: 20px     消息气泡、大容器
--wk-r-full: 9999px 圆形/胶囊
```

### 动效
```css
transition: all var(--wk-dur) var(--wk-ease);       /* 标准 200ms */
transition: all var(--wk-dur-fast) var(--wk-ease);  /* 快速 150ms */
```

---

## 组件规则

### 头像形状 — 身份规则（严格遵守）
```
人类用户  → border-radius: 50%
AI Bot   → border-radius: var(--wk-r-sm)
群组     → border-radius: var(--wk-r-md)
```

### 消息气泡 vs AI 面板
```css
/* 人类消息气泡 */
.msg-bubble {
  background: var(--semi-color-bg-1);
  border-radius: 2px var(--wk-r-lg) var(--wk-r-lg) var(--wk-r-lg); /* 左上直角 */
  max-width: 480px;
  border: 1px solid var(--wk-border-subtle);
}

/* AI 消息面板 */
.ai-panel {
  background: var(--semi-color-bg-0);
  border-radius: var(--wk-r-lg);   /* 全圆角 */
  max-width: 680px;
  border: 1px solid var(--wk-ai-border);
}
.ai-panel:hover { border-color: var(--wk-border-glow); }
```

### 输入框
```css
.input-box {
  border-radius: var(--wk-r-xl);
  border: 1px solid var(--wk-border-subtle);
  background: var(--semi-color-bg-1);
}
.input-box:focus-within {
  border-color: var(--wk-border-glow);
  box-shadow: 0 0 0 3px var(--wk-ai-glow);
}
.input-box.ai-mode {
  border-color: var(--wk-border-glow);
  background: var(--wk-brand-gradient-subtle);
}
```

### 会话列表项
```css
.conv { border-radius: var(--wk-r-md); }
.conv:hover  { background: var(--wk-bg-hover); }
.conv.active { background: var(--semi-color-bg-1); }
.conv.active::before {
  width: 3px; height: 60%;
  background: var(--wk-brand-gradient);
}
```

---

## Pre-commit Review

### 分级策略（省 token）
```
小改动 < 50行   → Haiku 快扫（便宜）
中改动 50-200行 → Sonnet 审（适中）
大改动 > 200行  → Opus 深审（贵但值）
PR 开之前       → Opus 最终 review（每个 PR 一次）
```

### Commit 前检查流程
```bash
# 1. 确认 changed files 数量合理（超过 8 个要警觉）
git diff --cached --stat

# 2. 检查有无无关文件混入
git diff --cached --name-only | grep -E "\.planning/|debug\.js"

# 3. 截图确认视觉
# debug.js 是本地工具，不在 repo 中，见 ONBOARDING.md 获取
node scripts/debug.js screenshot

# 4. 发截图给 Will 确认
# MEDIA:/Users/soso/.openclaw/workspace/xxx.png
```

### Review Checklist
- [ ] 没有硬编码颜色（品牌区半透明白色除外）
- [ ] 间距/圆角用了 token
- [ ] 没有 `!important`（用高优先级选择器代替）
- [ ] 没有 `.planning/`、`debug.js`、本地配置混入
- [ ] `git diff --stat` 文件数量符合预期
- [ ] 截图确认视觉没有回退

---

## Dark Mode

用 `--semi-color-*` 和 `--wk-*` 变量即自动支持 dark/light，因为 `tokens.css` 在两个 theme 下有不同值。

**禁止** 写 `@media (prefers-color-scheme: dark)` 单独覆盖。

---

## Semi Design 覆盖规范

```css
/* ✅ 在组件根节点覆盖 token */
.my-component {
  --semi-color-primary: var(--wk-brand-primary);
}

/* ✅ hover 用 color-mix + fallback */
.my-component {
  --semi-color-primary-hover: #6B4FD8;  /* fallback for old browsers */
  --semi-color-primary-hover: color-mix(in srgb, var(--wk-brand-primary) 85%, black);
}

/* ❌ 不要直接覆盖 Semi class */
.semi-button-primary { background: red; }
```

---

## Git 规范

```
分支格式：feat/sosoclaw/描述  |  fix/sosoclaw/描述
commit：英文，动词开头
一个 PR 只做一件事
```
