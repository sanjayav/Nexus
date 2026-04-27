/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_PASSWORD?: string
  readonly VERCEL_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
