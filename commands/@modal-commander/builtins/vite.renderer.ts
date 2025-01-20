import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, 'src/react-shim.js'),
      'react-dom': path.resolve(__dirname, 'src/react-dom-shim.js'),
      'react/jsx-runtime': path.resolve(__dirname, 'src/react-shim.js')
    }
  },
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'window.React.createElement',
    jsxFragment: 'window.React.Fragment',
    jsxImportSource: undefined,
  },
  build: {
    minify: false,
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/renderer.tsx'),
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'electron', 
        'zod'
      ],
      output: {
        dir: 'dist',
        entryFileNames: 'renderer.js',
        inlineDynamicImports: true,
      },
    },
  }
}); 