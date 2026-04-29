/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_ENTERPRISE_SSO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
