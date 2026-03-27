# 开发规范

> 基于 Vite 8 + pnpm 10 + React 18 迁移后更新（2026-03-27）

---

## 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Node.js | 20.x | 推荐 nvm 管理 |
| pnpm | 10.x | **必须用 pnpm，不要用 yarn/npm** |

```bash
# 安装 pnpm
npm install -g pnpm@10

# 安装依赖
pnpm install
```

---

## 常用命令

```bash
# 启动开发服务器（含局域网访问）
pnpm dev

# 生产构建
pnpm build

# 运行测试
pnpm test           # 根目录（turbo）
pnpm --filter @dmwork/web exec vitest run  # 单独跑 web 测试

# Lint
pnpm lint
```

---

## 包管理规范

### ❌ 不要用 yarn 或 npm install

```bash
# 错误
yarn add xxx
npm install xxx

# 正确
pnpm add xxx --filter @dmwork/web        # 给指定 package 装
pnpm add xxx                             # 给根目录装（工具类）
```

### workspace 内部依赖

monorepo 内 package 互相引用必须用 `workspace:*` 协议：

```json
// package.json
{
  "dependencies": {
    "@dmwork/base": "workspace:*"  // ✅
    "@dmwork/base": "*"            // ❌ pnpm 会尝试从 npm 安装
  }
}
```

### 声明你用的每一个包

pnpm 严格模式，用了没声明的包会报错。每个 package 只能用自己 `package.json` 里声明的依赖。

```bash
# 检查幽灵依赖
npx depcheck packages/dmworkbase
```

---

## 环境变量

**格式变了**，CRA 的 `REACT_APP_*` 已全部迁移到 `VITE_*`：

```bash
# .env.local（本地开发，不提交）
VITE_API_URL=https://your-api.example.com/api/v1/
```

代码里用法：

```tsx
// ❌ 旧写法（不再支持）
process.env.REACT_APP_API_URL

// ✅ 新写法
import.meta.env.VITE_API_URL
import.meta.env.DEV      // 替代 process.env.NODE_ENV === 'development'
import.meta.env.PROD     // 替代 process.env.NODE_ENV === 'production'
```

---

## 资源引用规范

Vite 不支持 `require()`，**新代码禁止使用**：

```tsx
// ❌ 旧写法（CommonJS，不支持）
src={require("./assets/icon.png")}

// ✅ 新写法（静态资源）
import icon from "./assets/icon.png"
src={icon}

// ✅ 新写法（需要动态路径）
src={new URL("./assets/icon.png", import.meta.url).href}
```

> 注意：现有代码里还有部分 `require()` 靠 `vite-plugin-commonjs` 垫片运行，后续会通过 `chore/migrate-require-to-import` 统一迁移。新代码不要再写 `require()`。

---

## 测试规范

测试框架已从 Jest 迁移到 **Vitest**，API 基本兼容，只有一处不同：

```ts
// ❌ Jest 写法
jest.fn()
jest.spyOn()
jest.useFakeTimers()

// ✅ Vitest 写法
vi.fn()
vi.spyOn()
vi.useFakeTimers()
```

运行测试：

```bash
cd apps/web && npx vitest run        # 单次
cd apps/web && npx vitest            # watch 模式
```

---

## Storybook

```bash
# 启动 Storybook（在 dmwork-web-storybook worktree 里）
pnpm storybook

# MCP Server 地址（供 Agent 查询组件信息）
http://localhost:6007/mcp
```

---

## 注意事项

1. **不要提交 `yarn.lock`**，项目已切换到 `pnpm-lock.yaml`
2. **不要在根目录 `package.json` 加 `workspaces` 字段**，已改用 `pnpm-workspace.yaml`
3. **新图片/资源用 import，不用 require**
4. **React 已升到 18**，如果写 class component 里有副作用，注意 StrictMode 下会双调用
