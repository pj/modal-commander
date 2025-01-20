import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    minify: false,
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'electron', 
        'electron-log', 
        'node:path', 
        'node:module', 
        'node:child_process', 
        'node:util', 
        'better-sqlite3', 
        'node:fs', 
        'node:os', 
        'zod', 
        'node:fs/promises'
      ],
      output: {
        dir: 'dist',
        entryFileNames: 'main.js',
        inlineDynamicImports: true,
      },
    },
  }
}); 