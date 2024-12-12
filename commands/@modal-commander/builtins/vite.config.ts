import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // plugins: [
  //   react({
  //       // jsxRuntime: 'classic',
  //   })
  // ],
  //   esbuild: {
  //       jsx: 'transform',
  //       jsxFactory: `window.React.createElement`,
  //       jsxFragment: `window.React.Fragment`,
  //   },
  //   resolve: {
  //       alias: {
  //           react: path.resolve(__dirname, 'src/react-shim.js'),
  //           'react-dom': path.resolve(__dirname, 'src/react-dom-shim.js'),
  //       },
  //   },
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
    lib: {
      entry: {
        main: path.resolve(__dirname, 'src/main.ts'),
        renderer: path.resolve(__dirname, 'src/renderer.tsx')
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['electron'],
      output: {
        dir: 'dist',
        entryFileNames: '[name].js',
      },
    },
  }
}) 