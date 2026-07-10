import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    cssMinify: true,
    rolldownOptions: {
      output: {
        minify: {
          compress: {
            dropConsole: true,
          },
        },
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
            if (id.includes('zxing')) {
              return 'vendor-zxing';
            }
            return 'vendor-others';
          }
        }
      }
    }
  }
})
