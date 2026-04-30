import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  optimizeDeps: {
    // 扫描 workspace 所有包的源码，让 Vite 提前发现并预编译所有依赖
    // 避免测试运行中途触发热重载导致 AttachmentPreview.stories 失败
    entries: [
      path.resolve(__dirname, '../../packages/*/src/**/*.{ts,tsx}'),
      path.resolve(__dirname, 'src/**/*.{ts,tsx}'),
    ],
  },
  plugins: [
    storybookTest({
      configDir: path.resolve(__dirname, '.storybook'),
    }),
  ],
  test: {
    name: 'storybook',
    // 容器化环境已足够稳定，但保留一次重试作为 CI 偶发抖动的兜底
    retry: 1,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
