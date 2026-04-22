/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional at type level: Web env doesn't require it (uses /api/v1/ relative path)
  // Required at runtime for Tauri/Electron builds (enforced in index.tsx)
  readonly VITE_API_URL?: string
  readonly VITE_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
