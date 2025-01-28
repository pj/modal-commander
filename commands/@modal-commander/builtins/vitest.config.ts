import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  // inspectBrk: true,
  // inspect: true,
  // fileParallelism: false,
  // browser: {
  //   provider: 'playwright',
  //   instances: [{ browser: 'chromium' }]
  // },
  },
  build: {
    sourcemap: true,
  },
  // optimizeDeps: {
  //   entries: ['src/**/*.ts']
  // }
}) 
