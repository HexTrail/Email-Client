import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../server', '')

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    define: {
      'process.env.DEFAULT_OTP': JSON.stringify(env.DEFAULT_OTP)
    },
    server: {
      proxy: {
        "/api": "http://localhost:5000",
      },
    },
  }
})

