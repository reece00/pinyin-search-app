import { appData, updateState, saveDataToLocalStorage } from './app-data.js'
import { showToast, trace } from './ui-utils.js'

function createNewFile(elements) {
  const timestamp = new Date().getTime()
  let maxNumber = 0
  for (const filename in appData.files) {
    const match = filename.match(/^新备忘录(\d+)$/)
    if (match) {
      const number = parseInt(match[1], 10)
      if (number > maxNumber) {
        maxNumber = number
      }
    }
  }
  const defaultName = `新备忘录${maxNumber + 1}`
  const newFiles = { ...appData.files };
  newFiles[defaultName] = { content: '', lastModified: timestamp };
  updateState({ files: newFiles }, { saveData: true });
  openFile(defaultName, elements)
  showToast('新文件已创建', elements)
}

function openFile(filename, elements) {
  if (!appData.files[filename]) return

  const doOpen = () => {
    const newFiles = { ...appData.files };
    newFiles[filename].lastModified = new Date().getTime();

    if (elements && elements.memoEditor) {
      const editor = elements.memoEditor
      const content = newFiles[filename].content || ''
      editor.value = content

      if (appData.autoScrollOnOpen && content) {
        editor.scrollTop = 1e9
      } else {
        editor.scrollTop = 0
      }
    }
    updateState({
      files: newFiles,
      currentFile: filename,
      isModified: false
    }, { saveData: true });

    if (elements && elements.filenameDisplay) {
      elements.filenameDisplay.textContent = filename
    }
  }

  if (appData.currentFile && appData.isModified) {
    if (confirm('当前文件有未保存的更改，是否继续？')) {
      doOpen()
    }
  } else {
    doOpen()
  }
}

function handleNewFile(elements) {
  if (appData.currentFile && appData.isModified) {
    if (confirm('当前文件有未保存的更改，是否继续创建新文件？')) {
      createNewFile(elements)
    }
  } else {
    createNewFile(elements)
  }
}

function handleDeleteFile(filename, elements) {
  if (appData.currentFile === filename) {
    if (Object.keys(appData.files).length === 1) {
      showToast('至少需要保留一个文件', elements)
      return
    }
    if (confirm(`删除"${filename}"后，所有内容将丢失`)) {
      const newFiles = { ...appData.files }
      delete newFiles[filename]
      updateState({ files: newFiles }, { saveData: true })

      const recentFiles = Object.keys(newFiles).sort((a, b) => newFiles[b].lastModified - newFiles[a].lastModified)
      if (recentFiles.length > 0) {
        openFile(recentFiles[0], elements)
      } else {
        createNewFile(elements)
      }
      closeFilePopup(elements)
      showToast('文件已删除', elements)
    }
  } else {
    if (confirm(`删除"${filename}"后，所有内容将丢失`)) {
      const newFiles = { ...appData.files }
      delete newFiles[filename]
      updateState({ files: newFiles }, { saveData: true })
      renderFileList(elements)
      showToast('文件已删除', elements)
    }
  }
}

function handleRenameFile(elements) {
  if (!appData.currentFile) {
    showToast('没有当前打开的文件', elements)
    return
  }
  const newFileName = window.prompt('请输入新的文件名:', appData.currentFile)
  if (newFileName === null) return
  const trimmedName = newFileName.trim()
  if (!trimmedName) {
    showToast('文件名不能为空', elements)
    return
  }
  if (trimmedName === appData.currentFile) return

  const newFiles = { ...appData.files }
  if (newFiles[trimmedName]) {
    if (confirm('文件名已存在，是否覆盖该文件的内容？')) {
      newFiles[trimmedName] = newFiles[appData.currentFile]
      delete newFiles[appData.currentFile]
      updateState({
        files: newFiles,
        currentFile: trimmedName
      }, { saveData: true })
      showToast('文件已重命名（已覆盖）', elements)
    }
    return
  }
  newFiles[trimmedName] = newFiles[appData.currentFile]
  delete newFiles[appData.currentFile]
  updateState({
    files: newFiles,
    currentFile: trimmedName
  }, { saveData: true })
  showToast('文件已重命名', elements)
}

function handleResetFilename(elements) {
  if (!appData.currentFile) {
    showToast('没有当前打开的文件', elements)
    return
  }
  const currentContent = appData.files[appData.currentFile].content
  if (!currentContent || !currentContent.trim()) {
    showToast('文件内容为空，无法重置文件名', elements)
    return
  }
  const lines = currentContent.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    showToast('文件内容为空，无法重置文件名', elements)
    return
  }
  const firstLine = lines[0].trim()
  if (firstLine.length > 20) {
    showToast('第一行文本过长（超过 20 字符），无法作为文件名', elements)
    return
  }

  const newFiles = { ...appData.files }
  if (newFiles[firstLine]) {
    if (confirm('文件名已存在，是否覆盖该文件的内容？')) {
      newFiles[firstLine] = newFiles[appData.currentFile]
      delete newFiles[appData.currentFile]
      updateState({
        files: newFiles,
        currentFile: firstLine
      }, { saveData: true })
      showToast('文件名已重置（已覆盖）', elements)
    }
    return
  }
  newFiles[firstLine] = newFiles[appData.currentFile]
  delete newFiles[appData.currentFile]
  updateState({
    files: newFiles,
    currentFile: firstLine
  }, { saveData: true })
  showToast('文件名已重置为第一行文本', elements)
}

function toggleFilePopup(elements) {
  if (elements.filePopup) {
    if (elements.filePopup.open) {
      elements.filePopup.close()
    } else {
      renderFileList(elements)
      elements.filePopup.showModal()
    }
  } else {
    console.error('filePopup element not found')
  }
}

function closeFilePopup(elements) {
  if (elements.filePopup) {
    elements.filePopup.close()
  } else {
    console.error('filePopup element not found')
  }
}

function renderFileList(elements) {
  if (!elements.fileList) {
    console.error('fileList element not found')
    return
  }
  elements.fileList.innerHTML = ''
  const filesOrder = Object.keys(appData.files)
  filesOrder.forEach(filename => {
    const fileItem = document.createElement('div')
    fileItem.className = `p-3 rounded-lg flex justify-between items-center ${appData.currentFile === filename ? 'bg-blue-50 dark:bg-blue-900/30 text-primary' : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'}`
    if (appData.currentFile !== filename) {
      fileItem.addEventListener('click', async () => {
        await openFile(filename, elements)
        closeFilePopup(elements)
      })
    }
    const fileInfo = document.createElement('div')
    fileInfo.className = 'flex items-center'
    const fileIcon = document.createElement('span')
    fileIcon.className = 'mr-3 text-base'
    fileIcon.textContent = '📄'
    const fileName = document.createElement('div')
    fileName.className = 'text-sm'
    fileName.textContent = filename
    fileInfo.appendChild(fileIcon)
    fileInfo.appendChild(fileName)
    const fileActions = document.createElement('div')
    fileActions.className = 'flex items-center space-x-3'
    if (appData.currentFile === filename) {
      const currentBadge = document.createElement('span')
      currentBadge.className = 'text-sm bg-primary text-white px-3 py-1.5 rounded-full min-w-[72px] text-center'
      currentBadge.textContent = '当前'
      fileActions.appendChild(currentBadge)
    }
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800/50 hover:bg-red-200 dark:hover:bg-red-800/70 min-w-[72px] transition-colors'
    deleteBtn.textContent = '删除'
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); handleDeleteFile(filename, elements) })
    fileActions.appendChild(deleteBtn)
    fileItem.appendChild(fileInfo)
    fileItem.appendChild(fileActions)
    elements.fileList.appendChild(fileItem)
  })
}

function isPinyinReady() {
  return !!pinyinLib
}

let pinyinProLoadPromise = null
let firstSearchScheduled = false
let pretextLib = null
let pinyinLib = null

async function loadPretext() {
  if (pretextLib) return pretextLib
  try {
    // 改为本地引入，解决网络错误并提升稳定性
    const mod = await import('./pretext/layout.js')
    pretextLib = mod
    return pretextLib
  } catch (e) {
    console.error('Failed to load pretext locally, falling back to basic scroll', e)
    return null
  }
}

async function loadPinyinPro() {
  if (pinyinProLoadPromise) return pinyinProLoadPromise
  pinyinProLoadPromise = (async () => {
    try {
      const mod = await import('./pinyin-pro-mod.js')
      pinyinLib = mod
      return pinyinLib
    } catch (e) {
      console.error('pinyin-pro load error:', e)
      throw e
    }
  })()
  return pinyinProLoadPromise
}

function parseAddressContent(content) {
  if (!content) return []
  const addressBlocks = content.split(/\r?\n\r?\n+/).filter(block => block.trim())
  return addressBlocks.map(block => {
    const lines = block.split(/\r?\n/).filter(line => line.trim())
    if (lines.length === 0) return null
    const address = lines[0].trim()
    const notes = lines.slice(1).join('\n').trim()
    if (lines.length === 1) { return null }
    return { address, notes, pinyinIndex: generatePinyinIndex(address) }
  }).filter(item => item !== null)
}

function generatePinyinIndex(address) {
  if (!address) return ''
  const chineseChars = address.replace(/[^\u4e00-\u9fa5]/g, '')
  if (!chineseChars) return ''
  const pinyin = pinyinLib && typeof pinyinLib.pinyin === 'function'
    ? pinyinLib.pinyin(chineseChars, { pattern: 'first', type: 'array', toneType: 'none', v: true })
    : []
  return Array.isArray(pinyin) ? pinyin.join('').toLowerCase() : (typeof pinyin === 'string' ? pinyin.toLowerCase() : '')
}

function splitAddressIntoWords(address) {
  if (!address) return []
  const words = []
  words.push(address)
  const separators = ['省', '市', '区', '县', '镇', '乡', '村', '路', '街', '巷', '号', '室', '单元', '栋', '层']
  let tempAddress = address
  separators.forEach(sep => {
    const parts = tempAddress.split(sep)
    if (parts.length > 1) {
      parts.forEach(part => { if (part.trim()) { words.push(part.trim() + sep) } })
      tempAddress = parts[parts.length - 1]
    }
  })
  for (let i = 0; i < address.length; i++) {
    for (let j = 2; j <= 4; j++) {
      if (i + j <= address.length) {
        const word = address.substr(i, j)
        if (/[\u4e00-\u9fa5]/.test(word)) { words.push(word) }
      }
    }
  }
  return Array.from(new Set(words))
}

function searchAddresses(addresses, query) {
  if (!query) return addresses
  const cleanQuery = query.toLowerCase().trim()
  const searchCache = new Map()
  return addresses.filter(item => {
    if (searchCache.has(item.address)) { return searchCache.get(item.address) }
    let isMatch = false
    if (item.pinyinIndex.includes(cleanQuery) || item.address.toLowerCase().includes(cleanQuery)) {
      isMatch = true
    } else {
      const words = splitAddressIntoWords(item.address)
      isMatch = words.some(word => {
        const wordPinyin = generatePinyinIndex(word)
        return wordPinyin.includes(cleanQuery) || word.toLowerCase().includes(cleanQuery)
      })
    }
    searchCache.set(item.address, isMatch)
    return isMatch
  })
}

function buildHighlightFragment(text, query) {
  const frag = document.createDocumentFragment()
  if (!text) { frag.appendChild(document.createTextNode('')); return frag }
  if (!query) { frag.appendChild(document.createTextNode(text)); return frag }

  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()

  // 1. 直接匹配高亮逻辑
  if (lowerText.includes(lowerQuery)) {
    let last = 0
    let matchPos = 0
    while ((matchPos = lowerText.indexOf(lowerQuery, last)) !== -1) {
      if (matchPos > last) {
        frag.appendChild(document.createTextNode(text.substring(last, matchPos)))
      }
      const span = document.createElement('span')
      span.className = 'highlight'
      span.textContent = text.substring(matchPos, matchPos + lowerQuery.length)
      frag.appendChild(span)
      last = matchPos + lowerQuery.length
    }
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.substring(last)))
    }
    return frag
  }

  // 2. 词组或拼音匹配逻辑
  const words = splitAddressIntoWords(text).filter(w => w && w !== text)
  const ranges = []
  words.forEach(word => {
    const lowerWord = word.toLowerCase()
    const wordPinyin = generatePinyinIndex(word)
    if (lowerWord.includes(lowerQuery) || wordPinyin.includes(lowerQuery)) {
      // 在文本中寻找该词的所有出现位置
      let last = 0
      let matchPos = 0
      while ((matchPos = text.indexOf(word, last)) !== -1) {
        ranges.push([matchPos, matchPos + word.length])
        last = matchPos + word.length
      }
    }
  })

  // 合并重叠区间并排序
  if (ranges.length === 0) {
    frag.appendChild(document.createTextNode(text))
    return frag
  }

  ranges.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const r of ranges) {
    if (!merged.length || r[0] > merged[merged.length - 1][1]) {
      merged.push(r)
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r[1])
    }
  }

  // 根据区间构建 DOM
  let pos = 0
  for (const [start, end] of merged) {
    if (start > pos) {
      frag.appendChild(document.createTextNode(text.substring(pos, start)))
    }
    const span = document.createElement('span')
    span.className = 'highlight'
    span.textContent = text.substring(start, end)
    frag.appendChild(span)
    pos = end
  }
  if (pos < text.length) {
    frag.appendChild(document.createTextNode(text.substring(pos)))
  }
  return frag
}

function renderSearchResults(results, elements) {
  elements.searchResultsList.innerHTML = ''
  const query = appData.searchQuery
  elements.resultsCount.textContent = `已找到${results.length}项`
  results.forEach(item => {
    const resultItem = document.createElement('div')
    resultItem.className = 'p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'
    const addressTitle = document.createElement('h3')
    addressTitle.className = 'text-base font-medium text-dark dark:text-gray-100'
    addressTitle.appendChild(buildHighlightFragment(item.address, query))
    const notesContent = document.createElement('div')
    notesContent.className = 'text-sm text-gray-600 dark:text-gray-400 mt-2'
    if (item.notes) {
      const noteLines = item.notes.split('\n')
      noteLines.forEach((line, index) => {
        if (index < 3) {
          const noteLine = document.createElement('p')
          noteLine.className = 'mb-1'
          noteLine.appendChild(buildHighlightFragment(line, query))
          notesContent.appendChild(noteLine)
        } else if (index === 3) {
          const moreNote = document.createElement('p')
          moreNote.className = 'text-xs text-gray-400 dark:text-gray-500'
          moreNote.textContent = `...还有${noteLines.length - 3}行`
          notesContent.appendChild(moreNote)
        }
      })
    }
    resultItem.appendChild(addressTitle)
    resultItem.appendChild(notesContent)
    resultItem.addEventListener('click', async () => {
      if (item.sourceFile) {
        openFile(item.sourceFile, elements)
        showEditorPage(elements)
        elements.memoEditor.focus()
        await scrollToAddress(item.address, elements)
      }
    })
    elements.searchResultsList.appendChild(resultItem)
  })
}

function showSearchResultsPage(results, elements) {
  elements.editorPage.classList.add('hidden')
  elements.searchResultsPage.classList.remove('hidden')
  if (elements.actionButtonsContainer) { elements.actionButtonsContainer.classList.add('hidden') }
  if (elements.searchResultsCloseContainer) { elements.searchResultsCloseContainer.classList.remove('hidden') }
  renderSearchResults(results, elements)
}

function showEditorPage(elements) {
  elements.editorPage.classList.remove('hidden')
  elements.searchResultsPage.classList.add('hidden')
  if (elements.actionButtonsContainer) { elements.actionButtonsContainer.classList.remove('hidden') }
  if (elements.searchResultsCloseContainer) { elements.searchResultsCloseContainer.classList.add('hidden') }
}

async function scrollToAddress(address, elements) {
  const editor = elements.memoEditor
  if (!editor || !address) return

  const content = editor.value
  const lines = content.split('\n')
  let targetLogicalLine = -1
  let charIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const indexInLine = lines[i].indexOf(address)
    if (indexInLine !== -1) {
      targetLogicalLine = i
      charIndex += indexInLine
      break
    }
    charIndex += lines[i].length + 1
  }

  if (targetLogicalLine !== -1) {
    const style = window.getComputedStyle(editor)
    const fontSize = parseFloat(style.fontSize)
    const fontFamily = style.fontFamily
    const fontWeight = style.fontWeight
    const font = `${fontWeight} ${fontSize}px ${fontFamily}`
    const width = editor.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const paddingTop = parseFloat(style.paddingTop)

    let lineHeight = parseFloat(style.lineHeight)
    if (isNaN(lineHeight)) {
      // 这里的 1.5 需要与 styles.css 中的保持一致
      lineHeight = fontSize * 1.5
    }

    const pretext = await loadPretext()
    let targetScrollTop = 0

    if (pretext) {
      // 方案：计算目标逻辑行之前所有完整行的高度
      // 如果目标在第 10 行，我们测量前 9 行的文本，并加上它们最后的换行符
      const textBefore = lines.slice(0, targetLogicalLine).join('\n') + (targetLogicalLine > 0 ? '\n' : '')
      const prepared = pretext.prepare(textBefore, font, { whiteSpace: 'pre-wrap' })
      const layoutResult = pretext.layout(prepared, width, lineHeight)

      // 居中计算：目标位置 = 之前的总高度 - 编辑器高度的一半 + 当前行高的一半
      // 这里 layoutResult.height 恰好是目标逻辑行顶部的 Y 坐标
      targetScrollTop = layoutResult.height - (editor.clientHeight / 2) + (lineHeight / 2) + paddingTop
    } else {
      const totalLines = lines.length
      const avgLineHeight = editor.scrollHeight / totalLines
      targetScrollTop = (avgLineHeight * targetLogicalLine) - (editor.clientHeight / 2) + (avgLineHeight / 2)
    }

    targetScrollTop = Math.max(0, targetScrollTop)

    // 设置光标并聚焦
    editor.focus()
    editor.setSelectionRange(charIndex, charIndex)

    // 执行滚动
    editor.scrollTop = targetScrollTop
    requestAnimationFrame(() => {
      editor.scrollTop = targetScrollTop
    })
  }
}

function clearSearchInput(elements) {
  elements.searchInput.value = ''
  appData.searchQuery = ''
  elements.clearInputBtn.classList.add('hidden')
  showEditorPage(elements)
}

function handleSearchInput(elements) {
  const query = elements.searchInput.value.trim().toLowerCase()
  appData.searchQuery = query
  if (globalThis.__DEV__) { trace('SEARCH', 'input_change', { query }) }
  elements.clearInputBtn.classList.toggle('hidden', !query)
  if (!query) {
    if (appData.debounceTimer) { clearTimeout(appData.debounceTimer); appData.debounceTimer = null }
    showEditorPage(elements)
    return
  }
  if (appData.debounceTimer) { clearTimeout(appData.debounceTimer) }
  appData.debounceTimer = setTimeout(() => {
    if (isPinyinReady()) { performSearch(elements) } else { scheduleFirstSearchOnce(elements) }
  }, 300)
}

function handleSearchFocus(elements) {
  const query = elements.searchInput.value.trim().toLowerCase()
  if (query) {
    appData.searchQuery = query
    if (isPinyinReady()) { performSearch(elements) } else { scheduleFirstSearchOnce(elements) }
  }
}

function scheduleFirstSearchOnce(elements) {
  if (firstSearchScheduled) return
  firstSearchScheduled = true
  loadPinyinPro().then(() => {
    if (firstSearchScheduled) { firstSearchScheduled = false; performSearch(elements) }
  }).catch(() => { firstSearchScheduled = false; showToast('拼音库加载失败', elements) })
}

function performSearch(elements) {
  const query = appData.searchQuery
  if (!query) { showEditorPage(elements); return }
  if (globalThis.__DEV__) { trace('SEARCH', 'search_start', { query }) }
  let allAddresses = []
  Object.keys(appData.files).forEach(fileName => {
    const file = appData.files[fileName]
    const fileAddresses = parseAddressContent(file.content)
    fileAddresses.forEach(address => { address.sourceFile = fileName })
    allAddresses = allAddresses.concat(fileAddresses)
  })
  const filteredAddresses = searchAddresses(allAddresses, query)
  if (globalThis.__DEV__) { trace('SEARCH', 'search_done', { query, total: allAddresses.length, matched: filteredAddresses.length }) }
  showSearchResultsPage(filteredAddresses, elements)
}

export const files = {
  toggleFilePopup,
  closeFilePopup,
  handleDeleteFile,
  handleNewFile,
  createNewFile,
  openFile,
  handleRenameFile,
  handleResetFilename,
  handleImportClipboard: function(elements) {
    showToast('准备导入剪贴板内容...', elements)
    if (!navigator.clipboard) { showToast('您的浏览器不支持剪贴板功能', elements); return }
    navigator.clipboard.readText().then(text => {
      if (!text.trim()) { showToast('剪切板为空', elements); return }
      const firstLine = text.split('\n')[0].trim()
      let fileNamePreview = sanitizeFileName(firstLine)
      if (!fileNamePreview || fileNamePreview.length < 2) { fileNamePreview = '新备忘录' }
      if (confirm('是否使用剪切板内容创建新文件？')) { doImportClipboard(text, elements) }
    }).catch(err => {
      console.error('无法读取剪切板:', err)
      if (err.name === 'NotAllowedError') { showToast('需要权限才能访问剪贴板，请确保应用在安全环境中运行', elements) } else { showToast('读取剪切板失败，请重试或手动粘贴内容', elements) }
    })
  },
  handleLoadExample: function(elements) {
    showToast('正在加载示例数据...', elements)
    fetch('示例数据.txt')
      .then(response => {
        if (!response.ok) { throw new Error('网络响应不正常') }
        return response.text()
      })
      .then(text => {
        if (!text.trim()) { showToast('示例数据为空', elements); return }
        doImportExample(text, elements)
      })
      .catch(err => {
        console.error('加载示例数据失败:', err)
        showToast('加载示例数据失败', elements)
      })
  },
  renderFileList
}

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').trim().substring(0, 50)
}

function doImportExample(text, elements) {
  const timestamp = new Date().getTime()
  let fileName = '示例数据'
  let finalFileName = fileName
  let counter = 1
  while (appData.files[finalFileName]) { finalFileName = `${fileName}${counter}`; counter++ }
  appData.files[finalFileName] = { content: text, lastModified: timestamp }
  saveDataToLocalStorage()
  openFile(finalFileName, elements)
  showToast(`已加载示例文件: ${finalFileName}`, elements)
}

function doImportClipboard(text, elements) {
  const timestamp = new Date().getTime()
  const firstLine = text.split('\n')[0].trim()
  let fileName = sanitizeFileName(firstLine)
  if (!fileName || fileName.length < 2) { fileName = `新备忘录_${timestamp}` }
  let finalFileName = fileName
  let counter = 1
  while (appData.files[finalFileName]) { finalFileName = `${fileName}_${counter}`; counter++ }
  appData.files[finalFileName] = { content: text, lastModified: timestamp }
  saveDataToLocalStorage()
  openFile(finalFileName, elements)
  showToast(`已从剪切板创建新文件: ${finalFileName}`, elements)
}

export const search = {
  performSearch,
  showSearchResultsPage,
  showEditorPage,
  handleSearchInput,
  handleSearchFocus,
  clearSearchInput,
  scrollToAddress
}

export const __test__ = {
  parseAddressContent,
  searchAddresses,
  splitAddressIntoWords,
  generatePinyinIndex,
  setPinyinLib: (lib) => { pinyinLib = lib }
}
