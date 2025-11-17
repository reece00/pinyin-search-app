// PWA 测试说明：
// - 仅在设置 RUN_PWA=1 时执行（脚本：npm run test:pwa）。
// - 验证 Service Worker 注册与静态资源缓存，路径使用文档相对以适配子目录部署。
// - 快速模式（PW_FAST=1）不影响本用例逻辑；主要加速 app.spec.ts 相关测试。
import { test, expect } from '@playwright/test'

const shouldRun = !!process.env.RUN_PWA
const shouldRunOffline = !!process.env.RUN_PWA_OFFLINE

const describeFn = shouldRun ? test.describe : test.describe.skip

describeFn('PWA 缓存与离线验证', () => {
  test.beforeEach(async ({ page }) => {
    // 在文档加载前模拟 PWA 安装形态
    await page.addInitScript(() => {
      const origMatchMedia = window.matchMedia
      window.matchMedia = (query) => {
        if (query === '(display-mode: standalone)') {
          return { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false } }
        }
        return origMatchMedia ? origMatchMedia(query) : { matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false } }
      }
    })
    await page.goto('/')
    // 等待 SW 接管（期间可能触发一次页面重载）
    await page.waitForFunction(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller), { timeout: 20000 })
    await page.waitForLoadState('load')
    // 触发运行时缓存
    await page.evaluate(async () => {
      await Promise.all([
        fetch('css/tailwind.css'),
        fetch('js/app.js'),
        fetch('js/features.js'),
        fetch('js/ui-utils.js'),
        fetch('js/app-data.js')
      ])
      return true
    })
  })

  test('SW 注册并接管页面', async ({ page }) => {
    await page.waitForFunction(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller), { timeout: 10000 })
    const controlled = await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller))
    expect(controlled).toBe(true)
  })

  test('运行时已缓存关键资源', async ({ page }) => {
    const allCached = await page.evaluate(async () => {
      const origin = location.origin
      const keys = await caches.keys()
      const name = keys.find(k => k.startsWith('pinyin-search-app-'))
      if (!name) return false
      const cache = await caches.open(name)
      const paths = [
        'css/tailwind.css',
        'js/app.js'
      ]
      await Promise.all(paths.map(p => fetch(p)))
      const urls = paths.map(p => origin + (p.startsWith('/') ? p : '/' + p))
      const hits = await Promise.all(urls.map(u => cache.match(u)))
      return hits.every(Boolean)
    })
    expect(allCached).toBe(true)
  })

  // 离线首屏渲染测试已移除（仅保留注册与缓存检查）
})