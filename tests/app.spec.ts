// 测试模式说明：
// - 标准模式：不设置 PW_FAST；真实加载拼音库，保留失败时的 trace 与截图，等待时间较长，适合完整回归。
// - 快速模式：设置环境变量 PW_FAST=1；注入轻量 pinyinPro stub，缩短超时与固定等待，加速本地迭代。
// - 运行命令：
//   * 标准：npm run test:e2e
//   * 快速：npm run test:e2e:fast
import { test, expect } from '@playwright/test'

const isFast = !!process.env.PW_FAST
import { hookConsole, hookRequestFailed, attachEvidence } from './helpers/test-evidence'

const testData = {
  '测试文件A': {
    content: [
      '北京市朝阳区\n备注A1\n备注A2',
      '',
      '上海市浦东新区\n备注B1'
    ].join('\n'),
    lastModified: Date.now()
  },
  '测试文件B': {
    content: '广州市天河区\n备注C1',
    lastModified: Date.now()
  }
}

let consoleLogs: { type: string; text: string }[]
let netFailedLogs: { url: string; failureText: string }[]

test.beforeEach(async ({ page }) => {
  // 预置拼音库 stub（加速模式）
  await page.addInitScript(({ fast }) => {
    if (fast) {
      // 提供轻量 pinyinPro 接口，满足测试断言
      (window as any).pinyinPro = {
        pinyin: (text: string, opts: any) => {
          const map: Record<string, string> = {
            '广': 'g', '州': 'z', '市': 's',
            '上': 's', '海': 'h',
            '北': 'b', '京': 'j',
            '天': 't', '河': 'h', '区': 'q',
            '朝': 'c', '阳': 'y',
            '浦': 'p', '东': 'd', '宁': 'n'
          }
          const arr = Array.from(text || '').map(ch => map[ch] || '')
          if (opts && opts.type === 'array') return arr
          return arr.join('')
        }
      }
    }
  }, { fast: isFast })
  await page.addInitScript(({ data }) => {
    // 预置本地数据，确保搜索有命中且可进行文件切换
    localStorage.setItem('addressBookData', JSON.stringify(data))
  }, { data: testData })
  await page.goto('/')
  // 等待应用初始化完成（文件名从默认变为测试文件A，表明 initApp 已执行并绑定事件）
  await expect(page.locator('#filename-display')).toHaveText('测试文件A')
  await expect(page.locator('#editor-page')).toBeVisible()
  await expect(page.locator('#search-input')).toBeVisible()
  consoleLogs = hookConsole(page)
  netFailedLogs = hookRequestFailed(page)
})

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await attachEvidence(testInfo, page, consoleLogs || [], netFailedLogs || [])
  }
})

test('初始化页面状态', async ({ page }) => {
  await expect(page.locator('#editor-page')).toBeVisible()
  await expect(page.locator('#search-results-page')).toHaveClass(/hidden/)
  await expect(page.locator('#action-buttons-container')).toBeVisible()
})

test('拼音首字母搜索（有结果）', async ({ page }) => {
  const input = page.locator('#search-input')
  await input.fill('gzs')
  await page.waitForFunction(() => (window as any).pinyinPro && typeof (window as any).pinyinPro.pinyin === 'function', { timeout: isFast ? 2000 : 10000 })
  await page.waitForFunction(() => document.querySelectorAll('#search-results-list > div').length > 0, { timeout: isFast ? 2500 : 5000 })
  await expect(page.locator('#search-results-page')).toBeVisible()
  await expect(page.locator('#results-count')).toContainText('已找到')
  await page.locator('#clear-input-btn').click()
  await expect(page.locator('#editor-page')).toBeVisible()
})

test('拼音首字母搜索（无结果）', async ({ page }) => {
  const input = page.locator('#search-input')
  await input.fill('zzz')
  await page.waitForFunction(() => (window as any).pinyinPro && typeof (window as any).pinyinPro.pinyin === 'function', { timeout: isFast ? 2000 : 10000 })
  await expect(page.locator('#search-results-page')).toBeVisible()
  await expect(page.locator('#results-count')).toHaveText('已找到0项')
  const listItems = await page.locator('#search-results-list > div').count()
  expect(listItems).toBe(0)
  await page.locator('#clear-input-btn').click()
  await expect(page.locator('#editor-page')).toBeVisible()
})

test('搜索→结果页→关闭返回编辑页', async ({ page }) => {
  const input = page.locator('#search-input')
  await input.fill('北京')
  // 输入防抖 300ms + 渲染时间
  await page.waitForTimeout(isFast ? 300 : 700)
  await expect(page.locator('#search-results-page')).toBeVisible()
  const countText = await page.locator('#results-count').textContent()
  expect(countText || '').toMatch(/已找到\d+项/)
  // 列表存在即可（不强制条目数量，避免外部库加载差异影响）
  await expect(page.locator('#search-results-list')).toBeVisible()
  await page.locator('#clear-input-btn').click()
  await expect(page.locator('#editor-page')).toBeVisible()
  await expect(page.locator('#search-results-page')).toHaveClass(/hidden/)
  await expect(input).toHaveValue('')
  await expect(page.locator('#clear-input-btn')).toHaveClass(/hidden/)
})

test('点击搜索结果跳转到对应文件并定位', async ({ page }) => {
  const input = page.locator('#search-input')
  await input.fill('gzs')
  // 先触发拼音库按需加载，再等待库就绪
  await page.waitForFunction(() => (window as any).pinyinPro && typeof (window as any).pinyinPro.pinyin === 'function', { timeout: isFast ? 2000 : 10000 })
  // 等待列表渲染稳定（至少一项）
  await page.waitForFunction(() => document.querySelectorAll('#search-results-list > div').length > 0, { timeout: isFast ? 2500 : 5000 })
  const firstItem = page.locator('#search-results-list > div').first()
  await firstItem.click()
  await expect(page.locator('#filename-display')).toHaveText('测试文件B')
  const memoText = await page.locator('#memo-editor').inputValue()
  expect(memoText).toContain('广州市天河区')
})

test('文件弹窗打开与切换文件', async ({ page }) => {
  await page.locator('#file-switch-btn').click()
  await expect(page.locator('#file-popup')).toBeVisible()
  // 点击列表中的“测试文件B”切换
  const fileItemB = page.locator('#file-list').getByText('测试文件B', { exact: true })
  await fileItemB.click()
  await expect(page.locator('#file-popup')).toHaveClass(/hidden/)
  await expect(page.locator('#filename-display')).toHaveText('测试文件B')
})

test('上一/下一文件按钮切换', async ({ page }) => {
  // 确保当前为测试文件A
  const nameEl = page.locator('#filename-display')
  const currentName = await nameEl.textContent()
  if (currentName !== '测试文件A') {
    // 打开弹窗后切换到A
    await page.locator('#file-switch-btn').click()
    await page.locator('#file-list').getByText('测试文件A', { exact: true }).click()
  }
  await expect(nameEl).toHaveText('测试文件A')
  // 下一文件 → B
  await page.locator('#next-file-btn').click()
  await expect(nameEl).toHaveText('测试文件B')
  // 上一文件 → A
  await page.locator('#prev-file-btn').click()
  await expect(nameEl).toHaveText('测试文件A')
})

test('菜单展开与保存操作', async ({ page }) => {
  // 修改编辑器内容
  const editor = page.locator('#memo-editor')
  await editor.fill('北京市朝阳区\n已修改备注')
  // 展开菜单
  await page.locator('#secondary-menu-btn').click()
  await expect(page.locator('#secondary-menu')).toBeVisible()
  // 保存
  await page.locator('#menu-save-btn').click()
  // 菜单关闭，数据持久化
  await expect(page.locator('#secondary-menu')).toHaveClass(/hidden/)
  const stored = await page.evaluate(() => localStorage.getItem('addressBookData'))
  expect(stored).toBeTruthy()
  const obj = JSON.parse(stored!)
  const name = await page.locator('#filename-display').textContent()
  expect(obj[name!].content.includes('已修改备注')).toBeTruthy()
})

// 无需自定义断言
