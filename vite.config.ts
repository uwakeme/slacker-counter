import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    sourcemap: 'hidden',
    outDir: 'dist',
    emptyOutDir: true,
    // Tauri 打包时不切 chunk,避免动态 import 在 WebView 里有问题
    target: 'es2021',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  plugins: [
    react(),
    tsconfigPaths()
  ],
})