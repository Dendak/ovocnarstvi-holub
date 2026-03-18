import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/ovocnarstvi-holub/',
  // In dev, serve parent dir so /img/... works. In build, images are copied by CI.
  publicDir: command === 'build' ? false : '../',
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
}))
