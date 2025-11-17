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
    await page.goto('/')
    // 确保已注册并等待就绪（如未注册则尝试注册）
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        if (regs.length === 0) {
          try { await navigator.serviceWorker.register('service-worker.js') } catch (e) { /* ignore */ }
        }
        await navigator.serviceWorker.ready
      }
      return true
    })
  })

  test('SW 注册与缓存键前缀存在', async ({ page }) => {
    const hasCachePrefix = await page.evaluate(async () => {
      const keys = await caches.keys()
      return keys.some(k => k.startsWith('pinyin-search-app-'))
    })
    expect(hasCachePrefix).toBe(true)
  })

  test('预加载资源已缓存', async ({ page }) => {
    const allCached = await page.evaluate(async () => {
      const keys = await caches.keys()
      const name = keys.find(k => k.startsWith('pinyin-search-app-'))
      if (!name) return false
      const cache = await caches.open(name)
      const paths = [
        'index.html',
        'css/tailwind.css',
        'js/app.js',
        'js/features.js',
        'js/ui-utils.js',
        'js/app-data.js'
      ]
      const hits = await Promise.all(paths.map(p => cache.match(p)))
      return hits.every(Boolean)
    })
    expect(allCached).toBe(true)
  })

  // 离线首屏渲染测试已移除（仅保留注册与缓存检查）
})