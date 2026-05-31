import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** GitHub Pages project site: https://baraatakala.github.io/gymbro/ */
const GITHUB_PAGES_BASE = '/gymbro/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? GITHUB_PAGES_BASE : '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          chart: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
}))
