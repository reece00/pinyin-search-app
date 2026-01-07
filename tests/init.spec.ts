import { test, expect } from '@playwright/test'

const isFast = !!process.env.PW_FAST

test.beforeEach(async ({ page }) => {
  // 预置拼音库 stub（加速模式）
  await page.addInitScript(({ fast }) => {
    if (fast) {
      (window as any).pinyinPro = {
        pinyin: (text: string, opts: any) => {
          return Array.from(text || '').join('')
        }
      }
    }
  }, { fast: isFast })
  // 不预置数据，模拟全新访问
})

test('初始化无数据时自动加载示例', async ({ page }) => {
  await page.goto('/')
  
  // 验证文件名自动变为“示例数据”
  await expect(page.locator('#filename-display')).toHaveText(/示例数据/, { timeout: 10000 })
  
  // 验证编辑器内容（匹配真实文件内容）
  await expect(page.locator('#memo-editor')).toHaveValue(/望京新城/)
  
  // 验证 Toast 提示加载中或加载完成
  // 注意：如果加载太快，可能抓不到 toast，主要验证结果即可
})
