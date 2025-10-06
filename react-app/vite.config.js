import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://miniature-trout-4j995q7w9qx3qv67-3001.app.github.dev',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
