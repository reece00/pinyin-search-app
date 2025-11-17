import type { Page, TestInfo } from '@playwright/test'

export function hookConsole(page: Page) {
  const logs: { type: string; text: string }[] = []
  const handler = (msg: any) => {
    logs.push({ type: msg.type(), text: msg.text() })
  }
  page.on('console', handler)
  return logs
}

export function hookRequestFailed(page: Page) {
  const failed: { url: string; failureText: string }[] = []
  page.on('requestfailed', (req) => {
    const failure = req.failure()
    failed.push({ url: req.url(), failureText: failure ? failure.errorText : 'unknown' })
  })
  return failed
}

export async function collectState(page: Page) {
  const dom = await page.evaluate(() => {
    const q = (sel: string) => document.querySelector(sel) as HTMLElement | null
    const getHidden = (el: HTMLElement | null) => !!el && el.classList.contains('hidden')
    const editorPage = q('#editor-page')
    const resultsPage = q('#search-results-page')
    const resultsCountEl = q('#results-count')
    const listEl = q('#search-results-list')
    const closeContainer = q('#search-results-close-container')
    const clearBtn = q('#clear-input-btn')
    const inputEl = q('#search-input') as HTMLInputElement | null
    const memoEl = q('#memo-editor') as HTMLTextAreaElement | null
    const filename = (q('#filename-display')?.textContent || '').trim()

    const listCount = listEl ? (listEl.querySelectorAll(':scope > div').length) : 0
    const resultsCountText = resultsCountEl ? resultsCountEl.textContent || '' : ''
    const storageRaw = localStorage.getItem('addressBookData') || ''
    const storagePreview = storageRaw.length > 600 ? storageRaw.slice(0, 600) + '…' : storageRaw

    return {
      filename,
      visibility: {
        editorHidden: getHidden(editorPage),
        resultsHidden: getHidden(resultsPage),
        closeContainerHidden: getHidden(closeContainer),
        clearBtnHidden: getHidden(clearBtn)
      },
      counts: { listCount },
      texts: {
        resultsCountText,
        inputValue: inputEl ? inputEl.value : '',
        memoPreview: memoEl ? (memoEl.value.split('\n').slice(0, 6).join('\n')) : ''
      },
      classes: {
        resultsPage: resultsPage ? Array.from(resultsPage.classList) : [],
        editorPage: editorPage ? Array.from(editorPage.classList) : [],
        closeContainer: closeContainer ? Array.from(closeContainer.classList) : [],
        clearBtn: clearBtn ? Array.from(clearBtn.classList) : []
      },
      storagePreview
    }
  })
  return dom
}

export async function attachEvidence(testInfo: TestInfo, page: Page, logs: { type: string; text: string }[], netFailed?: { url: string; failureText: string }[]) {
  const state = await collectState(page)
  const md = [
    `# 测试失败证据`,
    `- 文件: ${state.filename}`,
    `- 显隐: editorHidden=${state.visibility.editorHidden}, resultsHidden=${state.visibility.resultsHidden}, closeContainerHidden=${state.visibility.closeContainerHidden}, clearBtnHidden=${state.visibility.clearBtnHidden}`,
    `- 计数: listCount=${state.counts.listCount}`,
    `- 文案: resultsCountText="${state.texts.resultsCountText}"`,
    `- 输入框: value="${state.texts.inputValue}"`,
    `- 编辑器预览:\n\n${state.texts.memoPreview}`,
    `- 类名: resultsPage=${JSON.stringify(state.classes.resultsPage)}, closeContainer=${JSON.stringify(state.classes.closeContainer)}`,
    `- localStorage 预览: ${state.storagePreview}`,
    `- 控制台日志: ${logs.map(l => `[${l.type}] ${l.text}`).join('\n')}`,
    `- 网络失败: ${(netFailed || []).map(n => `${n.url} -> ${n.failureText}`).join('\n')}`
  ].join('\n')

  await testInfo.attach('evidence.md', { body: Buffer.from(md, 'utf-8'), contentType: 'text/markdown' })
  await testInfo.attach('evidence.json', { body: Buffer.from(JSON.stringify({ state, logs, netFailed }, null, 2), 'utf-8'), contentType: 'application/json' })
}
