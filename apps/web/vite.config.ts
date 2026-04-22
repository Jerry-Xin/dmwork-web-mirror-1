import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import commonjs from 'vite-plugin-commonjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiUrl = env.VITE_API_URL
  
  // 提取 origin
  let apiOrigin: string
  if (!apiUrl) {
    // 未配置时打印警告，fallback 到本地（proxy 将指向本地，请求会失败，但 dev server 可以正常启动）
    console.warn('[vite] ⚠️  VITE_API_URL is not set. API requests will fail. Please add it to apps/web/.env.local, e.g.: VITE_API_URL=https://im.deepminer.com.cn')
    apiOrigin = 'http://localhost:8080'
  } else {
    try {
      apiOrigin = new URL(apiUrl).origin
    } catch {
      throw new Error(`[vite] VITE_API_URL format is invalid: "${apiUrl}". Please use full URL, e.g. https://im.deepminer.com.cn`)
    }
  }
  
  return {
    plugins: [
      // TODO: remove after all require() calls are migrated to import (chore/migrate-require-to-import)
      commonjs(),
      react(),
      tsconfigPaths({ root: '../../' }),
    ],
    resolve: {
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      dedupe: ['react', 'react-dom'],
    },
    build: {
      outDir: 'build',
      sourcemap: false,
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api/': {
          target: apiOrigin,
          changeOrigin: true,
          secure: false, // 开发环境允许自签名证书
          rewrite: (path: string) => path.replace(/^\/api\//, '/'), // 剥离 /api/ 前缀，与 Nginx 行为一致
        },
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.PUBLIC_URL': '""',
    },
    envPrefix: 'VITE_',
  }
})
