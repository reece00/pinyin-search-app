// 显示提示消息
function showToast(message, elements) {
  if (!elements || !elements.toastMessage) {
    console.error('未找到toast元素');
    return;
  }
  
  const toastContainer = elements.toastMessage; // 实际为 #toast 容器
  const messageEl = toastContainer.querySelector('#toast-message');
  if (!messageEl) {
    console.error('未找到toast消息元素');
    return;
  }
  
  messageEl.textContent = message;
  toastContainer.classList.remove('hidden');
  toastContainer.classList.remove('opacity-0');
  toastContainer.classList.add('opacity-100');
  
  setTimeout(() => {
    toastContainer.classList.remove('opacity-100');
    toastContainer.classList.add('opacity-0');
    
    setTimeout(() => {
      messageEl.textContent = '';
      toastContainer.classList.add('hidden');
    }, 300);
  }, 3000);
}

// 适配iOS布局
function updateLayoutForIOS(elements) {
  // 检测是否为iOS设备
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  if (isIOS) {
    // 添加iOS专用类
    document.documentElement.classList.add('ios-device');
    
    // 调整底部功能区的padding，避免被Home Indicator遮挡
    if (elements.actionButtonsContainer) {
      elements.actionButtonsContainer.classList.add('ios-bottom-padding');
    }
    
    // 调整搜索结果页面的底部padding
    if (elements.searchResultsPage) {
      const searchResultsBottom = elements.searchResultsPage.querySelector('#search-results-bottom');
      if (searchResultsBottom) {
        searchResultsBottom.classList.add('ios-bottom-padding');
      }
    }
  }
}

// 阻止橡皮筋效果
function preventRubberBandEffect() {
  let startY;
  
  // 为document添加触摸事件监听
  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: false });
  
  document.addEventListener('touchmove', (e) => {
    // 获取当前滚动元素
    let currentScrollElement;
    if (document.scrollingElement.scrollTop > 0 || document.body.scrollTop > 0) {
      currentScrollElement = document.scrollingElement || document.body;
    } else {
      // 找到当前正在滚动的元素
      currentScrollElement = e.target;
      while (currentScrollElement !== document.body && !currentScrollElement.scrollTop) {
        currentScrollElement = currentScrollElement.parentElement;
      }
    }
    
    // 计算滚动方向
    const currentY = e.touches[0].clientY;
    const scrollDirection = currentY > startY ? 'up' : 'down';
    startY = currentY;
    
    // 当页面滚动到顶部或底部时，阻止继续滚动
    if (
      (currentScrollElement.scrollTop === 0 && scrollDirection === 'up') ||
      (currentScrollElement.scrollHeight - currentScrollElement.scrollTop === currentScrollElement.clientHeight && scrollDirection === 'down')
    ) {
      e.preventDefault();
    }
  }, { passive: false });
}

// 显示自动保存提示
function showAutoSaveIndicator(elements) {
  if (!elements || !elements.autoSaveIndicator) {
    console.error('未找到自动保存提示元素');
    return;
  }
  
  const indicator = elements.autoSaveIndicator;
  indicator.classList.remove('hidden');
  indicator.classList.remove('opacity-0');
  indicator.classList.add('opacity-100');
  
  setTimeout(() => {
    indicator.classList.remove('opacity-100');
    indicator.classList.add('opacity-0');
    setTimeout(() => {
      indicator.classList.add('hidden');
    }, 300);
  }, 1000);
}

// 处理点击外部关闭弹窗
function setupOutsideClickHandler(element, closeCallback) {
  // 添加点击事件监听
  document.addEventListener('click', function handleOutsideClick(event) {
    // 如果点击的元素不在弹窗内且不是弹窗的触发按钮
    if (element && !element.contains(event.target)) {
      closeCallback();
      
      // 移除事件监听
      document.removeEventListener('click', handleOutsideClick);
    }
  });
}

// 初始化PWA相关功能
function initPWA() {
  // 注册Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker 注册成功:', registration.scope);
        })
        .catch(error => {
          console.log('Service Worker 注册失败:', error);
        });
    });
  }
  
  // 添加安装到主屏幕的处理
  let deferredPrompt;
  const addBtn = document.querySelector('#install-button');
  
  // 监听beforeinstallprompt事件
  window.addEventListener('beforeinstallprompt', (e) => {
    // 阻止Chrome 67及更早版本自动显示安装提示
    e.preventDefault();
    // 保存事件以便稍后触发
    deferredPrompt = e;
    // 显示自定义的安装按钮
    if (addBtn) {
      addBtn.classList.remove('hidden');
    }
  });
  
  // 自定义安装按钮点击事件
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      // 显示安装提示
      deferredPrompt.prompt();
      
      // 等待用户响应
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`用户选择: ${outcome}`);
      
      // 清除保存的事件，因为只能使用一次
      deferredPrompt = null;
      
      // 隐藏安装按钮
      addBtn.classList.add('hidden');
    });
  }
}

// 创建一个新的文本编辑器
function createTextEditor(parentElement, initialContent = '') {
  const editor = document.createElement('textarea');
  editor.className = 'w-full h-full p-4 outline-none text-sm resize-none font-sans';
  editor.placeholder = '在此输入地址信息...';
  editor.value = initialContent;
  
  // 添加到父元素
  if (parentElement) {
    parentElement.appendChild(editor);
  }
  
  return editor;
}

// 创建一个搜索结果项
function createSearchResultItem(address, notes, sourceFile = '', query = '') {
  const resultItem = document.createElement('div');
  resultItem.className = 'bg-white rounded-lg shadow-sm p-4 card-transition';
  
  // 来源文件信息
  if (sourceFile) {
    const sourceFileElement = document.createElement('div');
    sourceFileElement.className = 'text-xs text-blue-500 mb-1';
    sourceFileElement.textContent = `来源: ${sourceFile}`;
    resultItem.appendChild(sourceFileElement);
  }
  
  // 地址标题
  const addressTitle = document.createElement('h3');
  addressTitle.className = 'text-base font-medium mb-1';
  addressTitle.innerHTML = highlightMatchingText(address, query);
  resultItem.appendChild(addressTitle);
  
  // 备注内容
  if (notes) {
    const notesContent = document.createElement('div');
    notesContent.className = 'text-sm text-gray-600 mt-2';
    
    const noteLines = notes.split('\n');
    noteLines.forEach((line, index) => {
      if (index < 3) { // 只显示前3行
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
    
    resultItem.appendChild(notesContent);
  }
  
  return resultItem;
}

// 高亮匹配的文本
function highlightMatchingText(text, query) {
  if (!query || !text) return text;
  
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // 直接文本匹配
  if (lowerText.includes(lowerQuery)) {
    let result = '';
    let lastIndex = 0;
    let matchPos = 0;
    
    while ((matchPos = lowerText.indexOf(lowerQuery, lastIndex)) !== -1) {
      result += text.substring(lastIndex, matchPos);
      result += `<span class="bg-yellow-200 px-0.5 py-0.5 rounded">${text.substring(matchPos, matchPos + lowerQuery.length)}</span>`;
      lastIndex = matchPos + lowerQuery.length;
    }
    
    result += text.substring(lastIndex);
    return result;
  }
  
  return text;
}

// 适配移动端键盘
function setupKeyboardHandling(elements) {
  if (!elements) return;
  
  // 监听键盘显示和隐藏事件
  window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    const previousHeight = window._previousHeight || currentHeight;
    
    // 保存当前高度
    window._previousHeight = currentHeight;
    
    // 检测键盘是否弹出（高度减少超过20%）
    const isKeyboardVisible = previousHeight - currentHeight > previousHeight * 0.2;
    
    if (isKeyboardVisible) {
      // 键盘弹出时，调整UI布局
      if (elements.actionButtonsContainer) {
        elements.actionButtonsContainer.classList.add('keyboard-visible');
      }
    } else {
      // 键盘隐藏时，恢复正常布局
      if (elements.actionButtonsContainer) {
        elements.actionButtonsContainer.classList.remove('keyboard-visible');
      }
    }
  });
  
  // 初始化保存高度
  window._previousHeight = window.innerHeight;
}

// 自适应文本区域高度
function autoResizeTextarea(textarea) {
  // 保存当前滚动位置
  const currentScrollTop = textarea.scrollTop;
  
  // 重置高度以便正确计算
  textarea.style.height = 'auto';
  
  // 设置新高度（加上一些padding）
  textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.7) + 'px';
  
  // 恢复滚动位置
  textarea.scrollTop = currentScrollTop;
}

// 导出模块
export {
  showToast,
  updateLayoutForIOS,
  preventRubberBandEffect,
  showAutoSaveIndicator,
  setupOutsideClickHandler,
  initPWA,
  createTextEditor,
  createSearchResultItem,
  highlightMatchingText,
  setupKeyboardHandling,
  autoResizeTextarea
};
