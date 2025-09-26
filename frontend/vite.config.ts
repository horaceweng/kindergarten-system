import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // 你可以改成喜歡的開發 port（不要用 3777）
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        // 把 /api 前綴移除，讓後端收到的路徑為 /auth/login 等
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})