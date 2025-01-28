import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: __dirname,
    include: ['test/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    testTimeout: 1000 * 29,
    environment: 'node',
    mockReset: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-electron/**', '**/release/**'],
  },
})
