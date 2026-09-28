import { resolve } from 'path'
import { cpSync } from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default defineConfig(({ command }) => ({
  plugins: [react(), {
    // PHP endpoints (order confirmation e-mail) live in ../api and run on the Wedos hosting.
    name: 'copy-php-api',
    apply: 'build',
    closeBundle() { cpSync(resolve(__dirname, '../api'), resolve(__dirname, 'dist/api'), { recursive: true }) },
  }],
  base: process.env.DEPLOY_TARGET === 'wedos' ? '/' : '/ovocnarstvi-holub/',
  // In dev, serve parent dir so /img/... works. In build, images are copied by CI.
  publicDir: command === 'build' ? false : '../',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        de: resolve(__dirname, 'index-de.html'),
        gdpr: resolve(__dirname, 'gdpr.html'),
        eshop: resolve(__dirname, 'eshop.html'),
      },
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
}))
