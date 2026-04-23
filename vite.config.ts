import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Vite serves the frontend; Vercel dev runs the serverless functions in api/*.ts.
// Proxy /api → VERCEL_API_URL (default http://localhost:3000, where `vercel dev` listens).
// Set VERCEL_API_URL in .env.local to point at a deployed backend instead.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VERCEL_API_URL || 'http://localhost:3000'
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
