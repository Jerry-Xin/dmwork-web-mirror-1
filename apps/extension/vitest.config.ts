import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// 仅跑纯函数单测 — 不加载 wxt 的注入 globals（browser、defineUnlistedScript 等）
export default defineConfig({
  plugins: [tsconfigPaths({ root: "../../" })],
  test: {
    globals: true,
    // jsdom 提供 File / Blob / window，buildSelectionMarkdownFile 用到
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // wxt 自己的产物 + 第三方
    exclude: ["node_modules", ".output", ".wxt"],
  },
});
