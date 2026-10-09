import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Vercel and any root-served host use '/'; GitHub Pages passes its repository
// subpath in VITE_BASE at build time.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  assetsInclude: ['**/*.glb', '**/*.hdr'],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // three, React Three Fiber and drei are left to follow the lazy
        // SceneCanvas import into their own chunk. Naming them here pulled
        // shared modules (React among them) into that chunk and made the
        // entry import it, so the whole of three loaded before first paint.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (id.includes('/gsap/') || id.includes('/lenis/')) return 'gsap'
          return undefined
        },
      },
    },
  },
})
