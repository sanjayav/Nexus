import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    exclude: ['node_modules', 'dist', 'tests/**', 'e2e/**'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'node_modules',
        'dist',
        'src/data/pttgc*',
        'api/_pttgcSeed.ts',
        'scripts/**',
        'tests/**',
      ],
    },
  },
})
