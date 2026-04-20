# Octo Extension v3 · Paper × Terminal × Moonwire (0.4.0)

V3 接力 V2，对齐 **Claude Design · Octo Extension v7** 设计稿：从 Claude Code CLI 风的"时间线阅读"升级为**三主题 × 两布局 × 浮层系统**。

设计源：[`../../Extension/Octo Extension v7.html`](../../Extension/Octo%20Extension%20v7.html)（4036 行）

---

## V2 → V3 变化速览

| 维度 | v2 | v3 |
|------|----|----|
| 主题 | 4 主题：paper / cc-dark / cursor-nocturne / dim | **3 主题**：paper / terminal / moonwire — 各自有独立 DNA |
| 布局模式 | 3 变体：doc / calm / minimal | **2 布局**：message / cli — 直接切 |
| Token 命名 | `--wk-text-primary` 等语义名 | **`--wk-ink-*` / `--wk-brand-*`** 原子名 + v2 兼容别名 |
| 顶栏 | 无 | **Demo-bar**（Chrome 侧栏 chrome 模拟：logo + 工作区 + 设置 + 关闭） |
| Rail 位置 | 左侧 | **右侧**（浏览器插件靠右栏，rail 沿插件外边界） |
| Rail 样式 | 40×40 竖栏 | **48×32** 彩色字母瓦片（方块 = Channel，圆 = PM，橙色 @ = mention） |
| Rail overflow | Picker 浮层 | **+N 按钮 → ovPicker** 全屏树（群聊 / 私聊 Tab） |
| 设置入口 | 齿轮按钮 + 菜单 | **demo-bar 齿轮 → popSettings** 2 段式控件 |
| 搜索 | 无 | **head 🔍 → popSearch**（联系人 / 群组 / 文件 3 Tab） |
| 群信息 | 无 | **头部"共 N 人"→ drawerMembers**（Hero + 开关 + 成员分组） |
| 消息气泡 | 圆点时间线 | 保留 ✅，加入 **hover 操作条 + 折叠 + 附件 grid ↔ list** |
| 附件 | 统一 chip | **layout=message → 56px 方格**；**layout=cli → 文件行** |
| 通讯录 | 无 | **drawerContacts**（新朋友 + AI 伙伴 + 我的朋友 A-Z 索引） |
| Cmd+K | content script 浮层 | **ovCmdk v3**（✦ 发送到 Octo + 目标 chip + GitHub 引用 + 图片行 + 圆形 send） |
| Spinner | 动词轮转 | 保留，精简样式 |

---

## 三主题 DNA

1. **paper**（默认）· `#FFFFFF` canvas · `#7C5CFC` 品牌紫 · `#F97316` 珊瑚橙 @ mention · 现代中性风
2. **terminal** · `#F7F6F1` 暖米 canvas · `#F54E00` Cursor 橙 · Source Serif 4 标题 · JetBrains Mono 元信息 · Cursor DNA
3. **moonwire** · `#0F1011` 近黑 canvas · `#7170FF` Linear 靛紫 · Inter 510 · Geist Mono · Linear DNA

三主题共用同一份 HTML 结构；通过 `body[data-theme="*"]` 切换（见 [`shared/tokens.css`](shared/tokens.css)）。

## 两布局

- **message** — 更宽的 body 行距、无竖线、首屏间距更松（日常阅读默认）
- **cli** — 紧凑、保留 `ts-line` 竖线、附件变"文件名行"（CC 终端风）

body 上挂 `data-layout="message|cli"`；任何时候点 ⚙️ → "阅读模式" 一键切换，localStorage 持久化。

---

## 代码结构

```
octo-extension-v3/
├── manifest.json             ← name / version → v3 / 0.4.0
├── sidepanel/
│   ├── sidepanel.html        ← 极简 shell（body 挂 theme/layout，app 为 .ext）
│   ├── sidepanel.css         ← ⭐ 重写（对齐 v7 结构：demo-bar + rail + main + overlays）
│   └── sidepanel.js          ← ⭐ 重写（v7 渲染 + 浮层状态机 + 主题/布局切换）
├── shared/
│   └── tokens.css            ← ⭐ 重写（ink-scale + brand + 3 主题，v2 token 保留别名）
├── content/                  ← 不变（Cmd+K 浮层通过 token 别名继续工作）
├── background.js, popup/, options/, icons/  ← 不变
```

**v2 与 v3 可并存安装**：manifest `name` 不同（Chrome 视为两个插件）。

## 快速开始

1. `chrome://extensions` → 开发者模式
2. 「加载已解压的扩展程序」→ 选 `octo-extension-v3/` 目录
3. 工具栏出现紫色 Octo v3 图标
4. 点图标 → 开始聊天 → 侧栏从右推开
5. 右上齿轮 → 切主题 / 切阅读模式
6. ⌘K（在任意网页或侧栏内）→ 呼出 Cmd+K 面板

---

## 第四轮改进（content script Cmd+K 对齐 v3）

- **content script Cmd+K 重写**：之前仍是 v2 的"源信息卡片 + 三段式 section + bottom toolbar + 两按钮"结构，现在对齐 [`Octo Cmd+K v3.html`](../../Extension/Octo%20Cmd+K%20v3.html)：
  - `.octo-cmdk-top` — **AI avatar ✦ + "发送到 Octo" 渐变标题 + 目标 chip（glyph + name + 🧵 thread-tag + ▾）+ 关闭 ×**
  - `.octo-cmdk-quote` — **3px 紫色左竖线** + favicon + "来源 · 选中 N 字" meta + body（底部渐变） + 展开/收起
  - `.octo-cmdk-imgs` — **横排 72×72 缩略图** + 末尾 dashed "+" add 按钮
  - `.octo-cmdk-input-wrap` — 无边框 textarea（auto-resize）
  - `.octo-cmdk-foot` — @/📷/📎/😊 tools + ESC 键帽提示 + **圆形 34px send-plane**（灰 → 激活后紫色渐变）
- **scrim 加深**：`rgba(20,20,28,0.48) + blur(8px)`，真正模态感
- **三主题适配**：shadow host 读 `chrome.storage.local.octo_v3_theme` 并挂 `data-theme`；storage onChanged 监听主题变更，浮层随侧栏同步切换
- **测试页**：[`content/_test-cmdk.html`](content/_test-cmdk.html) 可在本地直接打开，Paper/Terminal/Moonwire 三主题按钮即时切换（展开/收起也在）

## 第三轮改进（密度收紧 + 未读环）

- **Rail 未读红圈**恢复：`.r-badge` 换成 Apple 式三层 box-shadow（红中心 → rail-bg 间隙 → 外红环），17px 红点 + 可见红环，远看一眼识别
- **Picker 彻底收紧**：
  - Tabs `15px → 13px`，padding 从 `8px 16px → 5px 11px`，header padding `12/14 → 10/12`
  - Channel 行 `min-height 32px → 27px`，label `14/600 → 13/500`，icon `20px → 17px`
  - Thread 行 `min-height 28px → 24px`，label `13.5/500 → 12.5/500`，indent `28 → 26`
  - Category 行改成 **11px uppercase 0.04em letter-spacing**（Figma 款 section header）
  - Tree 连线位置从 `20px → 18px`，细节匹配更小的 icon
- **修复 `.empty` 类冲突**：`.tree-tri.empty` → `.tree-tri.is-empty`（全局 `.empty { padding: 40px 20px }` 误伤 tri span，把行撑到 80px）

## 第二轮改进（Figma Web 对齐 + 用户反馈）

- **消息版真头像** — message 布局用 32×32 彩色首字母圆角头像（teal/amber/coral/mine/bot 分色），cli 保持 7px 圆点，两种布局视觉差异鲜明
- **Rail 数字 badge + @ 标** — 未读数字圆形红底（v2 只有小圆点），有 @mention 时叠加橙色 @ 覆盖（vs. Figma 中右上角的 mention indicator）
- **Picker 对齐 Figma Web 设计**：
  - 顶 Tab 改成 pill（白底 + 阴影 active）+ 红色数字 badge
  - Channel 图标用 emoji（🎙/🔥/🎯/⚖️/🐙/🧪/📋…）按名称模式推断
  - 当前频道左侧 **2.5px 黑色竖线**（不再用紫色背景）
  - Thread 子节点缩进 28px，带连接线（20px 位置 1px 灰线 + 10px 水平线）
  - 每个 channel 超 2 个 Thread 时出现 "展开 N 个 Thread" 折叠控件，展开变 "收起"
  - 有 @mention 的行头部加 **@我** 橙色标
  - 数字 badge 移到最右侧，红字无底色（对齐 Figma）
- **全屏编辑 modal** — Composer 展开按钮触发；覆盖整个 ext，大 textarea（70vh+）+ 工具栏 + ⌘↵ 发送 + Esc 收起
- **Cmd+K scrim 加深** — `is-cmdk` 变体把 backdrop 改成 `rgba(20,20,28,0.48)` + `blur(6px)`，读起来才像真正的模态浮层
- **Esc 优先级** — popover → fullcomp → cmdk → picker → drawers，逐层关闭

## 已实现 ✓

- `.demo-bar` 顶栏，logo + 工作区 + 设置/置顶/关闭
- 48px Rail：pinned 上限 7，超出走 +N picker；右键菜单（关闭/免打扰/固定/更多）
- Main 头：channel `#` 标 + 成员数 chip + 搜索图标
- Stream 消息：时间线 + 圆点 + 名字配色（绿=我 / 紫渐变=Bot / 灰=他人）+ Agent 小标
- Body 渲染：代码块 / 引用 / 列表 / 行内 code / bold / 行内链接 / `[...](...)` → src chip
- 附件：`attach-grid`（message）↔ `attach-list`（cli）自动切换
- 折叠：消息超 10 行或 540 字自动折叠 + 48px 渐变遮罩 + "展开(+N 行)"
- Composer：textarea 自适应高度 + 字数 + mention/attach/expand 工具按钮 + 附件 chip 行
- 发送到 Bot 会话：动词轮转 spinner（30 个词，1.5s 换）→ 模拟回复
- 主题切换 popover：3 段式选择器（点 dot 彩色区分）
- 阅读模式切换 popover：2 段式（message/cli）
- 搜索 popover：3 Tab（联系人 / 群组 / 文件）+ 高亮 mark
- Rail + 新建 popover：群聊 / 私聊 / 分组
- 群信息 drawer：Hero + 2 toggle + AI 组 + 成员组（Owner Badge）+ 危险操作区
- Picker：群聊 / 私聊 2 Tab，Category → Channel 树（可折叠），点击即切
- Cmd+K v3：✦ AI 头像 + "发送到 Octo" + 目标 chip（Channel · 🧵Thread ▾）+ GitHub 引用（favicon + 选中 N 字 + 展开）+ 图片附件行（+ 添加）+ 多行 textarea + 底部工具（@/📷/📎 + ESC + 紫色圆形 send），三主题适配
- 通讯录 drawer：从**左**滑入（rail 右置），新朋友 + AI 伙伴 + 我的朋友（A-Z 分组 + 右侧索引条）
- Toast：全局反馈，theme-aware（terminal 变全大写 mono，moonwire 变反色）
- Backdrop + Esc + 外点关闭：统一浮层交互

## 待办 ◻︎

- Lightbox：点附件缩略图放大（骨架已就位，click handler 未挂）
- Cmd+K 目标选择器：v3 设计里的 target-pop 浮层（Channel / Thread 列表）暂为 toast 占位
- 真实后端对接：目前完全走 `DEMO_BASE_MESSAGES`；把 `selectThread()` 里的 `loadMessages` 接上
- Emoji picker：工具按钮占位，未实现面板
- WebSocket：延续 v2 的 5s 轮询（未接入）
- Contacts 索引条拖动 / 气泡：v7 有 drag-across 行为 + letter bubble，v3 暂只做点击跳转

---

## 设计决策解说

### 为什么 token 用 ink-scale？

v7 的设计本质是**把所有中性色折叠成同一个 ink 的不同透明度**。这样三套主题只需要改 3 件事：`--wk-ink-100`（基色 hex）+ `--wk-bg-*`（4 个 surface）+ `--wk-brand`（品牌色），所有派生色（60 / 45 / 35 / 12 / 08 / 05 / 03）自动换算。代码里任何用到 `rgba(ink, X)` 的地方都靠 token 控制，切主题时一次性刷新。

### 为什么是 3 主题不是 4？

v2 有 cc-dark / dim 两种暗色，功能重复（都只是"不同明度的暗色"）。v3 合并成一个 moonwire（Linear 靛紫），并新增 terminal（暖米 Serif，Cursor DNA）—— 三个主题**气质差异足够大**，切换时有"换了个应用"的感觉，而不是"调了下颜色"。

### 为什么 Rail 在右边？

浏览器插件在 Chrome 侧边面板里，本身就**贴右边界**运行。Rail 如果在左边，会和主内容的阅读流方向冲突（从主区域向外看，Rail 在"远处"）。放到右边后，Rail 贴着插件外边界、挨着浏览器工具栏，鼠标从 omnibox / 标签栏下来就能直达，符合"从外向内"的使用动线。

Drawer 与 Picker 相应从**左侧**滑入覆盖 main，保留 Rail 可见 —— 这样随时可切别的会话，不会被悬浮窗吞掉导航。

### 为什么 Rail 只放 7 个？

Apple Dock 和 Discord 都证明了：竖栏 7-10 个图标是视觉扫描上限。超出的全丢给 +N picker（全屏树），代价是多一步点击，但把 Rail 保持在"一眼能全部认出"的密度。

### 为什么 attachment 有两种视图？

- 看图（message）：缩略图优先，56×56 方格一眼看完
- 看文件（cli）：文件名 + 大小优先，类似 `ls -lh` 的行视图

layout 切换不止是视觉偏好，还隐含"当前任务是看内容还是看元数据"。

---

## 参考

- v7 设计稿：[`../../Extension/Octo Extension v7.html`](../../Extension/Octo%20Extension%20v7.html)
- v7 截图：[`../../Extension/screenshots/`](../../Extension/screenshots/)（v7-msg-layout-fixed.png / v7-picker-current.png 等）
- v2 仓库：[`../octo-extension-v2/`](../octo-extension-v2/)
