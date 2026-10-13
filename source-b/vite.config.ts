import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The prototype ships as a single inlined HTML file, so the bundled Inter
    // files have to travel inside the CSS rather than beside it.
    assetsInlineLimit: 200000,
    // The prototype is delivered as one inlined HTML file, so no part of the
    // bundle may arrive as a separate chunk request.
    rolldownOptions: { output: { inlineDynamicImports: true } },
    chunkSizeWarningLimit: 4000,
  },
})
