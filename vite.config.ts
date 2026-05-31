import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** GitHub Pages project site: https://baraatakala.github.io/gymbro/ */
const GITHUB_PAGES_BASE = '/gymbro/'

function devHtmlEntry() {
  return {
    name: 'use-dev-html-entry',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, _res, next) => {
        const r = req as { url?: string }
        const url = r.url ?? ''
        if (url === '/' || url === '/index.html') {
          r.url = '/index.dev.html'
        }
        next()
      })
    },
  }
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? GITHUB_PAGES_BASE : '/',
  plugins: [
    react(),
    tailwindcss(),
    ...(command === 'serve' ? [devHtmlEntry()] : []),
  ],
  build: {
    rollupOptions: {
      input: {
        index: 'index.dev.html',
      },
      output: {
        manualChunks: {
          chart: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
}))
