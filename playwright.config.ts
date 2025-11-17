import { defineConfig, devices } from '@playwright/test'

const isFast = !!process.env.PW_FAST

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: isFast ? 4 : undefined,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8080/',
    browserName: 'webkit',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    locale: 'zh-CN',
    headless: true,
    screenshot: isFast ? 'off' : 'only-on-failure',
    video: 'off',
    trace: isFast ? 'off' : 'retain-on-failure'
  },
  reporter: [
    isFast ? ['list'] : ['json', { outputFile: 'reports/e2e.json' }]
  ],
  webServer: {
    command: 'node scripts/server.js',
    port: 8080,
    reuseExistingServer: true,
    timeout: 120000
  }
})
