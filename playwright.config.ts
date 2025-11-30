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
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    deviceScaleFactor: 3,
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
