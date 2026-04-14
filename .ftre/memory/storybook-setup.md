# Storybook 组件开发环境

> 前端组件开发和文档工具，配置位于 apps/web 目录下，非项目根目录

## 核心文件

| 文件 | 职责 |
|------|------|
| `apps/web/.storybook/main.ts` | Storybook 主配置文件（入口、插件、解析器） |
| `apps/web/.storybook/preview.ts` | 预览区全局配置（装饰器、主题） |

## 启动命令

```bash
cd apps/web
pnpm storybook
```

- 默认端口：`6006`
- 如需指定端口，修改 `package.json` 中的 `storybook` 脚本

## 常见错误

### SB_CORE-SERVER_0006 (MainFileMissingError)
**原因**：在项目根目录运行 `npx storybook dev`，找不到 `.storybook` 配置目录。

**解决**：切换到 `apps/web` 目录，使用 `pnpm storybook` 启动。

## 设计决策

- **配置置于 apps/web**：作为 web 应用专属开发工具，与项目其他包（如 electron）解耦
- **pnpm script 封装**：通过 `package.json` 脚本统一配置项，避免命令行参数记忆负担

## 注意事项

- Storybook 配置在 `apps/web/.storybook/`，非项目根目录 `.storybook/`
- 使用 `pnpm storybook` 而非 `npx storybook dev -p 16006`
- 启动前确认当前目录为 `apps/web`
