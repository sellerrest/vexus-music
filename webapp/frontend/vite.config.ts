import { defineConfig } from 'vite'
import pkg from './package.json'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Версия из package.json попадает прямо в код — см. src/version.ts.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        /*
         * Библиотеки — отдельным файлом от нашего кода.
         *
         * Они меняются раз в полгода, а приложение — каждую выкладку. В одном
         * общем файле любая правка кнопки заставляла пользователя качать
         * заново и React, и анимации, и весь набор значков. Разделив, мы
         * оставляем большой неизменный кусок лежать в кэше браузера.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          if (id.includes('framer-motion') || id.includes('motion-')) return 'vendor-motion'
          if (id.includes('lucide-react')) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
})
