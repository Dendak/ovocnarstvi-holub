import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: process.env.DEPLOY_TARGET === 'wedos' ? '/' : '/ovocnarstvi-holub/',
  // In dev, serve parent dir so /img/... works. In build, images are copied by CI.
  publicDir: command === 'build' ? false : '../',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        de: resolve(__dirname, 'index-de.html'),
      },
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
}))
