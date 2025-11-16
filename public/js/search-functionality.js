import { appData } from './app-data.js';
import { openFile } from './file-management.js';
import { showToast } from './ui-utils.js';

let pinyinProLoadPromise = null;
let firstSearchScheduled = false;

function isPinyinReady() {
  const lib = globalThis.pinyinPro;
  return !!(lib && typeof lib.pinyin === 'function');
}

function loadPinyinPro() {
  if (pinyinProLoadPromise) return pinyinProLoadPromise;
  pinyinProLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = './pinyin-pro.js';
    script.async = true;
    script.onload = () => resolve(globalThis.pinyinPro);
    script.onerror = () => reject(new Error('pinyin-pro load error'));
    document.head.appendChild(script);
  });
  return pinyinProLoadPromise;
}

function isSearchResultsVisible(elements) {
  return elements && elements.searchResultsPage && !elements.searchResultsPage.classList.contains('hidden');
}

function isPWAInstalled() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator.standalone === true);
}

function updateTopSpacerVisibility(elements) {
  if (!elements || !elements.searchResultsTopSpacer) return;
  const isActive = document.activeElement === elements.searchInput;
  const hasPendingHide = appData.searchSpacerTimer != null;
  const hasQuery = (
    elements.searchInput && elements.searchInput.value.trim().length > 0
  ) || (appData.searchQuery && appData.searchQuery.length > 0);
  const shouldShow = isSearchResultsVisible(elements) && hasQuery && (isActive || hasPendingHide);
  if (shouldShow) {
    elements.searchResultsTopSpacer.style.height = isPWAInstalled() ? 'calc(40vh + var(--safe-area-inset-top))' : '32vh';
  }
  elements.searchResultsTopSpacer.classList.toggle('hidden', !shouldShow);
}

function scheduleFirstSearchOnce(elements) {
  if (firstSearchScheduled) return;
  firstSearchScheduled = true;
  (pinyinProLoadPromise || loadPinyinPro()).then(() => {
    if (firstSearchScheduled) {
      firstSearchScheduled = false;
      performSearch(elements);
    }
  }).catch(() => {
    firstSearchScheduled = false;
    showToast('拼音库加载失败', elements);
  });
}

// 解析地址内容
function parseAddressContent(content) {
  if (!content) return [];
  
  // 按空行分割地址段
  const addressBlocks = content.split(/\n{2,}/).filter(block => block.trim());
  
  return addressBlocks.map(block => {
    const lines = block.split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;
    
    const address = lines[0].trim();
    const notes = lines.slice(1).join('\n').trim();
    
    // 跳过只有单行（没有备注）的数据块
    if (lines.length === 1) {
      return null;
    }
    
    return {
      address,
      notes,
      // 生成首字母索引
      pinyinIndex: generatePinyinIndex(address)
    };
  }).filter(item => item !== null);
}

// 生成地址的拼音索引
function generatePinyinIndex(address) {
  if (!address) return '';
  
  // 提取中文部分
  const chineseChars = address.replace(/[^\u4e00-\u9fa5]/g, '');
  if (!chineseChars) return '';
  
  // 生成拼音首字母
  const lib = globalThis.pinyinPro;
  const pinyin = lib && typeof lib.pinyin === 'function'
    ? lib.pinyin(chineseChars, {
        pattern: 'first',
        type: 'array',
        toneType: 'none',
        v: true
      })
    : [];
  
  // 生成完整首字母串
  return Array.isArray(pinyin)
    ? pinyin.join('').toLowerCase()
    : (typeof pinyin === 'string' ? pinyin.toLowerCase() : '');
}


// 将地址拆分为词语
function splitAddressIntoWords(address) {
  if (!address) return [];
  
  // 简单的地址拆分逻辑
  const words = [];
  
  // 添加完整地址
  words.push(address);
  
  // 按常见地址分隔符拆分
  const separators = ['省', '市', '区', '县', '镇', '乡', '村', '路', '街', '巷', '号', '室', '单元', '栋', '层'];
  let tempAddress = address;
  
  separators.forEach(sep => {
    const parts = tempAddress.split(sep);
    if (parts.length > 1) {
      parts.forEach(part => {
        if (part.trim()) {
          words.push(part.trim() + sep);
        }
      });
      tempAddress = parts[parts.length - 1];
    }
  });
  
  // 添加地址中的每个词（2-4个字符）
  for (let i = 0; i < address.length; i++) {
    for (let j = 2; j <= 4; j++) {
      if (i + j <= address.length) {
        const word = address.substr(i, j);
        // 只添加包含中文的词
        if (/[\u4e00-\u9fa5]/.test(word)) {
          words.push(word);
        }
      }
    }
  }
  
  // 去重并返回
  return [...new Set(words)];
}

// 搜索地址
function searchAddresses(addresses, query) {
  if (!query) return addresses;
  
  // 预处理查询，移除非字母字符
  const cleanQuery = query.toLowerCase().trim();
  
  // 使用缓存来避免重复计算
  const searchCache = new Map();
  
  return addresses.filter(item => {
    // 检查缓存
    if (searchCache.has(item.address)) {
      return searchCache.get(item.address);
    }
    
    // 计算匹配结果
    let isMatch = false;
    
    // 快速检查：完整首字母匹配和直接地址匹配
    if (item.pinyinIndex.includes(cleanQuery) || item.address.toLowerCase().includes(cleanQuery)) {
      isMatch = true;
    } else {
      // 检查地址中的每个词语 - 使用更高效的方式
      const words = splitAddressIntoWords(item.address);
      isMatch = words.some(word => {
        const wordPinyin = generatePinyinIndex(word);
        return wordPinyin.includes(cleanQuery) || word.toLowerCase().includes(cleanQuery);
      });
    }
    
    // 缓存结果
    searchCache.set(item.address, isMatch);
    return isMatch;
  });
}

// 执行搜索 - 搜索所有备忘录文件
function performSearch(elements) {
  const query = appData.searchQuery;
  // 空查询不进入搜索结果页
  if (!query) {
    showEditorPage(elements);
    return;
  }
  
  // 遍历所有文件，收集所有地址
  let allAddresses = [];
  Object.keys(appData.files).forEach(fileName => {
    const file = appData.files[fileName];
    const fileAddresses = parseAddressContent(file.content);
    // 为每个地址添加文件名信息，方便显示来源
    fileAddresses.forEach(address => {
      address.sourceFile = fileName;
    });
    allAddresses = allAddresses.concat(fileAddresses);
  });
  
  // 搜索匹配的地址
  const filteredAddresses = searchAddresses(allAddresses, query);
  
  // 显示搜索结果页面
  showSearchResultsPage(filteredAddresses, elements);
}

// 显示搜索结果页面
function showSearchResultsPage(results, elements) {
  // 切换到搜索结果页面
  elements.editorPage.classList.add('hidden');
  elements.searchResultsPage.classList.remove('hidden');
  
  // 隐藏按钮容器
  if (elements.actionButtonsContainer) {
    elements.actionButtonsContainer.classList.add('hidden');
  }
  
  // 显示关闭按钮
  if (elements.searchResultsCloseContainer) {
    elements.searchResultsCloseContainer.classList.remove('hidden');
  }
  updateTopSpacerVisibility(elements);
  
  // 更新结果数量 - 使用新的样式显示在右上角
  elements.resultsCount.textContent = `已找到${results.length}项`;
  
  // 渲染搜索结果
  renderSearchResults(results, elements);
  
  // 显示/隐藏无结果提示
  elements.searchResultsList.classList.toggle('hidden', results.length === 0);
  elements.noResultsMessage.classList.toggle('hidden', results.length > 0);
}

// 显示编辑器页面
function showEditorPage(elements) {
  elements.searchResultsPage.classList.add('hidden');
  elements.editorPage.classList.remove('hidden');
  // 隐藏顶部占位
  if (elements.searchResultsTopSpacer) {
    elements.searchResultsTopSpacer.classList.add('hidden');
  }
  // 清除可能存在的隐藏计时器
  if (appData.searchSpacerTimer) {
    clearTimeout(appData.searchSpacerTimer);
    appData.searchSpacerTimer = null;
  }
  
  // 隐藏关闭按钮
  if (elements.searchResultsCloseContainer) {
    elements.searchResultsCloseContainer.classList.add('hidden');
  }
  
  // 显示按钮容器
  if (elements.actionButtonsContainer) {
    elements.actionButtonsContainer.classList.remove('hidden');
  }
}

// 渲染搜索结果
function renderSearchResults(results, elements) {
  elements.searchResultsList.innerHTML = '';
  
  // 获取搜索关键词
  const query = appData.searchQuery.toLowerCase();
  
  results.forEach(item => {
    const resultItem = document.createElement('div');
    resultItem.className = 'bg-white rounded-lg shadow-sm p-4 card-transition';
    
    // 显示来源文件信息
    if (item.sourceFile) {
      const sourceFileElement = document.createElement('div');
      sourceFileElement.className = 'text-xs text-blue-500 mb-1';
      sourceFileElement.textContent = `来源: ${item.sourceFile}`;
      resultItem.appendChild(sourceFileElement);
    }
    
    // 地址标题 - 高亮匹配部分
    const addressTitle = document.createElement('h3');
    addressTitle.className = 'text-base font-medium mb-1';
    addressTitle.innerHTML = highlightMatchingText(item.address, query);
    
    // 备注内容 - 高亮匹配部分
    const notesContent = document.createElement('div');
    notesContent.className = 'text-sm text-gray-600 mt-2';
    
    // 处理备注内容，显示前几行
    if (item.notes) {
      const noteLines = item.notes.split('\n');
      noteLines.forEach((line, index) => {
        if (index < 3) { // 只显示前3行备注
          const noteLine = document.createElement('p');
          noteLine.className = 'mb-1';
          noteLine.innerHTML = highlightMatchingText(line, query);
          notesContent.appendChild(noteLine);
        } else if (index === 3) {
          const moreNote = document.createElement('p');
          moreNote.className = 'text-xs text-gray-400';
          moreNote.textContent = `...还有${noteLines.length - 3}行`;
          notesContent.appendChild(moreNote);
        }
      });
    }
    
    // 组装结果项
    resultItem.appendChild(addressTitle);
    resultItem.appendChild(notesContent);
    
    // 添加点击事件
    resultItem.addEventListener('click', () => {
      // 点击结果项时跳转到编辑器并高亮对应地址
      // 如果有来源文件信息，先打开该文件
      if (item.sourceFile) {
        openFile(item.sourceFile, elements);
      }
      scrollToAddress(item.address, elements);
    });
    
    elements.searchResultsList.appendChild(resultItem);
  });
}

// 高亮匹配的文本
function highlightMatchingText(text, query) {
  if (!query || !text) return text;
  
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // 快速路径：直接文本匹配，性能最高
  if (lowerText.includes(lowerQuery)) {
    // 使用字符串操作而非正则，避免正则转义问题
    let result = '';
    let lastIndex = 0;
    let matchPos = 0;
    
    while ((matchPos = lowerText.indexOf(lowerQuery, lastIndex)) !== -1) {
      // 添加匹配前的文本
      result += text.substring(lastIndex, matchPos);
      // 添加带高亮的匹配文本
      result += `<span class="highlight">${text.substring(matchPos, matchPos + lowerQuery.length)}</span>`;
      // 更新位置
      lastIndex = matchPos + lowerQuery.length;
    }
    
    // 添加最后剩余的文本
    result += text.substring(lastIndex);
    return result;
  }
  
  // 获取文本中的所有词语（排除完整地址）
  let words = splitAddressIntoWords(text);
  words = words.filter(word => word !== text);
  
  let highlightedText = text;
  let hasMatch = false;
  
  // 创建高亮包装函数
  const wrapWithHighlight = (match) => {
    hasMatch = true;
    return `<span class="highlight">${match}</span>`;
  };
  
  // 对每个词语进行检查
  words.forEach(word => {
    // 检查词语的拼音首字母是否包含搜索关键词
    const wordPinyin = generatePinyinIndex(word).toLowerCase();
    if (wordPinyin.includes(lowerQuery)) {
      // 对匹配的词语进行高亮，使用更安全的正则转义
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedWord, 'gi');
      highlightedText = highlightedText.replace(regex, wrapWithHighlight);
    }
    // 检查词语本身是否包含搜索关键词
    else if (word.toLowerCase().includes(lowerQuery)) {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQuery, 'gi');
      highlightedText = highlightedText.replace(regex, wrapWithHighlight);
    }
  });
  
  // 如果没有匹配到任何词语，尝试拼音首字母匹配
  if (!hasMatch) {
    const textPinyin = generatePinyinIndex(text).toLowerCase();
    if (textPinyin.includes(lowerQuery)) {
      // 找到匹配的拼音首字母对应的字符范围
      const matchPos = textPinyin.indexOf(lowerQuery);
      const matchEndPos = matchPos + lowerQuery.length;
      
      // 将拼音位置映射到原文本中的中文字符
      const matchPositions = [];
      let pinyinIndex = 0;
      
      for (let i = 0; i < text.length && pinyinIndex < matchEndPos; i++) {
        if (/[\u4e00-\u9fa5]/.test(text[i])) {
          if (pinyinIndex >= matchPos && pinyinIndex < matchEndPos) {
            matchPositions.push(i);
          }
          pinyinIndex++;
        }
      }
      
      // 如果找到了匹配位置，高亮这些字符
      if (matchPositions.length > 0) {
        // 从后往前替换，避免位置偏移
        for (let i = matchPositions.length - 1; i >= 0; i--) {
          const pos = matchPositions[i];
              highlightedText =
                highlightedText.substring(0, pos) +
                `<span class="highlight">${text[pos]}</span>` +
                highlightedText.substring(pos + 1);
        }
      }
    }
  }
  
  return highlightedText;
}

// 滚动到指定地址记录
function scrollToAddress(address, elements) {
  // 切换回编辑器页面
  showEditorPage(elements);

  // 在编辑器中查找并定位到地址（同步执行，保持用户手势上下文）
  const content = elements.memoEditor.value;

  // 改进的地址查找逻辑：使用正则表达式确保找到的是完整的地址行
  const addressRegex = new RegExp('(^|\n\n)' + address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  let match = addressRegex.exec(content);

  // 如果没有找到精确匹配，尝试更宽松的匹配
  if (!match) {
    const looseRegex = new RegExp(address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    match = looseRegex.exec(content);
  }

  if (match) {
    // 获取地址的起始位置（考虑到可能捕获的换行符）
    const addressIndex = match.index + (match[1] ? match[1].length : 0);

    // 设置光标位置到地址开头（同步，以唤起iOS键盘）
    elements.memoEditor.focus();
    elements.memoEditor.setSelectionRange(addressIndex, addressIndex);

    // 计算滚动位置并微调放入渲染帧，避免阻塞手势
    const doScrollAdjust = () => {
      // 创建一个临时的div来测量文本高度
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.top = '-9999px';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = elements.memoEditor.offsetWidth + 'px';
      tempDiv.style.font = getComputedStyle(elements.memoEditor).font;
      tempDiv.style.lineHeight = getComputedStyle(elements.memoEditor).lineHeight;
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.textContent = content.substring(0, addressIndex);
      document.body.appendChild(tempDiv);

      const scrollHeight = tempDiv.offsetHeight;
      document.body.removeChild(tempDiv);

      const targetScrollTop = Math.max(0, scrollHeight - (elements.memoEditor.clientHeight / 4));
      elements.memoEditor.scrollTop = targetScrollTop;

      requestAnimationFrame(() => {
        elements.memoEditor.scrollTop = targetScrollTop;
        requestAnimationFrame(() => {
          elements.memoEditor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    };

    // 使用rAF而非定时器，避免丢失手势上下文
    requestAnimationFrame(doScrollAdjust);
  }
}

// 清空搜索输入
function clearSearchInput(elements) {
  elements.searchInput.value = '';
  appData.searchQuery = '';
  elements.clearInputBtn.classList.add('hidden');
  
  showEditorPage(elements);
}

// 处理搜索输入
function handleSearchInput(elements) {
  const query = elements.searchInput.value.trim().toLowerCase();
  appData.searchQuery = query;
  
  // 显示/隐藏清空按钮
  elements.clearInputBtn.classList.toggle('hidden', !query);
  
  // 如果搜索结果页面已显示，同步到搜索结果页面的搜索框
  if (!elements.searchResultsPage.classList.contains('hidden')) {
    if (elements.searchResultsInput) {
      elements.searchResultsInput.value = query;
    }
    if (elements.searchResultsClearBtn) {
      elements.searchResultsClearBtn.classList.toggle('hidden', !query);
    }
  }
  
  // 如果没有搜索词，显示编辑器页面
  if (!query) {
    // 清除可能尚未触发的搜索防抖
    if (appData.debounceTimer) {
      clearTimeout(appData.debounceTimer);
      appData.debounceTimer = null;
    }
    showEditorPage(elements);
    return;
  }
  
  // 防抖处理
  if (appData.debounceTimer) {
    clearTimeout(appData.debounceTimer);
  }
  
  appData.debounceTimer = setTimeout(() => {
    if (isPinyinReady()) {
      performSearch(elements);
    } else {
      scheduleFirstSearchOnce(elements);
    }
  }, 300);
}


// 处理搜索框焦点事件
function handleSearchFocus(elements) {
  const query = elements.searchInput.value.trim().toLowerCase();
  updateTopSpacerVisibility(elements);
  // 清除可能存在的隐藏计时器，避免刚获得焦点就被隐藏
  if (appData.searchSpacerTimer) {
    clearTimeout(appData.searchSpacerTimer);
    appData.searchSpacerTimer = null;
  }
  if (query) {
    appData.searchQuery = query;
    if (isPinyinReady()) {
      performSearch(elements);
    } else {
      scheduleFirstSearchOnce(elements);
    }
  }
}

// 处理搜索框失焦事件：延迟600毫秒隐藏顶部占位，避免点击结果项跳转中断
function handleSearchBlur(elements) {
  if (appData.searchSpacerTimer) {
    clearTimeout(appData.searchSpacerTimer);
  }
  const hasQuery = (
    elements.searchInput && elements.searchInput.value.trim().length > 0
  ) || (appData.searchQuery && appData.searchQuery.length > 0);
  if (!hasQuery) {
    appData.searchSpacerTimer = null;
    updateTopSpacerVisibility(elements);
    return;
  }
  appData.searchSpacerTimer = setTimeout(() => {
    appData.searchSpacerTimer = null;
    updateTopSpacerVisibility(elements);
  }, 600);
}


// 导出模块
export {
  parseAddressContent,
  generatePinyinIndex,
  searchAddresses,
  performSearch,
  showSearchResultsPage,
  showEditorPage,
  renderSearchResults,
  highlightMatchingText,
  scrollToAddress,
  clearSearchInput,
  handleSearchInput,
  handleSearchFocus,
  handleSearchBlur,
  
};
