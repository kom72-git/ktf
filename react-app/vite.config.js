import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://curly-space-happiness-g4v6qp4rxxvw3wvj5-3001.app.github.dev',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
