import { appData, saveDataToLocalStorage } from './app-data.js'
import { showToast } from './ui-utils.js'

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
  appData.files[defaultName] = { content: '', lastModified: timestamp }
  saveDataToLocalStorage()
  openFile(defaultName, elements)
  showToast('新文件已创建', elements)
}

function openFile(filename, elements) {
  if (!appData.files[filename]) return
  if (appData.currentFile && appData.isModified) {
    if (confirm('当前文件有未保存的更改，是否继续？')) {
      appData.files[filename].lastModified = new Date().getTime()
      if (elements && elements.memoEditor) {
        elements.memoEditor.value = appData.files[filename].content || ''
        if (appData.autoScrollOnOpen) {
          requestAnimationFrame(() => { elements.memoEditor.scrollTop = elements.memoEditor.scrollHeight })
        }
      }
      appData.currentFile = filename
      appData.isModified = false
      if (elements && elements.filenameDisplay) {
        elements.filenameDisplay.textContent = filename
      }
    }
  } else {
    appData.files[filename].lastModified = new Date().getTime()
    if (elements && elements.memoEditor) {
      elements.memoEditor.value = appData.files[filename].content || ''
      if (appData.autoScrollOnOpen) {
        requestAnimationFrame(() => { elements.memoEditor.scrollTop = elements.memoEditor.scrollHeight })
      }
    }
    appData.currentFile = filename
    appData.isModified = false
    if (elements && elements.filenameDisplay) {
      elements.filenameDisplay.textContent = filename
    }
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
      delete appData.files[filename]
      saveDataToLocalStorage()
      const recentFiles = Object.keys(appData.files).sort((a, b) => appData.files[b].lastModified - appData.files[a].lastModified)
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
      delete appData.files[filename]
      saveDataToLocalStorage()
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
  if (appData.files[trimmedName]) {
    showToast('文件名已存在', elements)
    return
  }
  appData.files[trimmedName] = appData.files[appData.currentFile]
  delete appData.files[appData.currentFile]
  appData.currentFile = trimmedName
  saveDataToLocalStorage()
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
    showToast('第一行文本过长（超过20字符），无法作为文件名', elements)
    return
  }
  if (appData.files[firstLine]) {
    showToast('该文件名已存在', elements)
    return
  }
  appData.files[firstLine] = appData.files[appData.currentFile]
  delete appData.files[appData.currentFile]
  appData.currentFile = firstLine
  saveDataToLocalStorage()
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
    fileItem.className = `p-3 rounded-lg flex justify-between items-center ${appData.currentFile === filename ? 'bg-blue-50 text-primary' : 'hover:bg-gray-50 cursor-pointer'}`
    if (appData.currentFile !== filename) {
      fileItem.addEventListener('click', () => {
        openFile(filename, elements)
        closeFilePopup(elements)
      })
    }
    const fileInfo = document.createElement('div')
    fileInfo.className = 'flex items-center'
    const fileIcon = document.createElement('i')
    fileIcon.className = 'fa fa-file-text-o mr-3'
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
    deleteBtn.className = 'text-sm bg-red-100 text-red-600 px-3 py-1.5 rounded-full border border-red-200 hover:bg-red-200 min-w-[72px] transition-colors'
    deleteBtn.textContent = '删除'
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); handleDeleteFile(filename, elements) })
    fileActions.appendChild(deleteBtn)
    fileItem.appendChild(fileInfo)
    fileItem.appendChild(fileActions)
    elements.fileList.appendChild(fileItem)
  })
}

function isPinyinReady() {
  const lib = globalThis.pinyinPro
  return !!(lib && typeof lib.pinyin === 'function')
}

let pinyinProLoadPromise = null
let firstSearchScheduled = false

function loadPinyinPro() {
  if (pinyinProLoadPromise) return pinyinProLoadPromise
  pinyinProLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'js/pinyin-pro.js'
    script.async = true
    script.onload = () => resolve(globalThis.pinyinPro)
    script.onerror = () => reject(new Error('pinyin-pro load error'))
    document.head.appendChild(script)
  })
  return pinyinProLoadPromise
}

function parseAddressContent(content) {
  if (!content) return []
  const addressBlocks = content.split(/\n{2,}/).filter(block => block.trim())
  return addressBlocks.map(block => {
    const lines = block.split('\n').filter(line => line.trim())
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
  const lib = globalThis.pinyinPro
  const pinyin = lib && typeof lib.pinyin === 'function'
    ? lib.pinyin(chineseChars, { pattern: 'first', type: 'array', toneType: 'none', v: true })
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

function renderSearchResults(results, elements) {
  elements.searchResultsList.innerHTML = ''
  const query = appData.searchQuery
  elements.resultsCount.textContent = `已找到${results.length}项`
  results.forEach(item => {
    const resultItem = document.createElement('div')
    resultItem.className = 'p-3 bg-white rounded-lg shadow-sm border border-gray-200'
    const addressTitle = document.createElement('h3')
    addressTitle.className = 'text-base font-medium text-dark'
    addressTitle.innerHTML = highlightMatchingText(item.address, query)
    const notesContent = document.createElement('div')
    notesContent.className = 'text-sm text-gray-600 mt-2'
    if (item.notes) {
      const noteLines = item.notes.split('\n')
      noteLines.forEach((line, index) => {
        if (index < 3) {
          const noteLine = document.createElement('p')
          noteLine.className = 'mb-1'
          noteLine.innerHTML = highlightMatchingText(line, query)
          notesContent.appendChild(noteLine)
        } else if (index === 3) {
          const moreNote = document.createElement('p')
          moreNote.className = 'text-xs text-gray-400'
          moreNote.textContent = `...还有${noteLines.length - 3}行`
          notesContent.appendChild(moreNote)
        }
      })
    }
    resultItem.appendChild(addressTitle)
    resultItem.appendChild(notesContent)
    resultItem.addEventListener('click', () => {
      if (item.sourceFile) {
        openFile(item.sourceFile, elements)
         showEditorPage(elements)
         elements.memoEditor.focus()
         scrollToAddress(item.address, elements)
      }
    })
    elements.searchResultsList.appendChild(resultItem)
  })
}

function highlightMatchingText(text, query) {
  if (!query || !text) return text
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  if (lowerText.includes(lowerQuery)) {
    let result = ''
    let lastIndex = 0
    let matchPos = 0
    while ((matchPos = lowerText.indexOf(lowerQuery, lastIndex)) !== -1) {
      result += text.substring(lastIndex, matchPos)
      result += `<span class="highlight">${text.substring(matchPos, matchPos + lowerQuery.length)}</span>`
      lastIndex = matchPos + lowerQuery.length
    }
    result += text.substring(lastIndex)
    return result
  }
  let words = splitAddressIntoWords(text)
  words = words.filter(word => word !== text)
  let highlightedText = text
  let hasMatch = false
  const wrapWithHighlight = (match) => { hasMatch = true; return `<span class="highlight">${match}</span>` }
  words.forEach(word => {
    const lowerWord = word.toLowerCase()
    const wordPinyin = generatePinyinIndex(word)
    if (lowerWord.includes(lowerQuery)) {
      highlightedText = highlightedText.replace(word, wrapWithHighlight(word))
    } else if (wordPinyin.includes(lowerQuery)) {
      const idx = highlightedText.indexOf(word)
      if (idx !== -1) {
        highlightedText = highlightedText.substring(0, idx) + wrapWithHighlight(word) + highlightedText.substring(idx + word.length)
      }
    }
  })
  return hasMatch ? highlightedText : text
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

function scrollToAddress(address, elements) {
  const content = appData.files[appData.currentFile]?.content || ''
  if (!content || !address) return
  const lines = content.split('\n')
  let targetLine = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(address)) {
      targetLine = i
      break
    }
  }
  if (targetLine !== -1 && elements.memoEditor) {
    const totalLines = lines.length
    const lineHeight = elements.memoEditor.scrollHeight / totalLines
    const targetScrollTop = lineHeight * targetLine
    elements.memoEditor.scrollTop = targetScrollTop
    requestAnimationFrame(() => {
      elements.memoEditor.scrollTop = targetScrollTop
      elements.memoEditor.scrollIntoView({ behavior: 'smooth', block: 'center' })
      let charIndex = 0
      for (let i = 0; i < targetLine; i++) {
        charIndex += lines[i].length + 1
      }
      elements.memoEditor.selectionStart = elements.memoEditor.selectionEnd = charIndex
      elements.memoEditor.focus()
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
  elements.clearInputBtn.classList.toggle('hidden', !query)
  if (!elements.searchResultsPage.classList.contains('hidden')) {
    if (elements.searchResultsInput) { elements.searchResultsInput.value = query }
    if (elements.searchResultsClearBtn) { elements.searchResultsClearBtn.classList.toggle('hidden', !query) }
  }
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
  let allAddresses = []
  Object.keys(appData.files).forEach(fileName => {
    const file = appData.files[fileName]
    const fileAddresses = parseAddressContent(file.content)
    fileAddresses.forEach(address => { address.sourceFile = fileName })
    allAddresses = allAddresses.concat(fileAddresses)
  })
  const filteredAddresses = searchAddresses(allAddresses, query)
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
