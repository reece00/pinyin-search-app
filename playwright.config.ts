import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8081/',
    browserName: 'webkit',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'retain-on-failure'
  },
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'reports/e2e.json' }]
  ],
  webServer: {
    command: 'node server.js',
    port: 8081,
    reuseExistingServer: true,
    timeout: 120000
  }
})
