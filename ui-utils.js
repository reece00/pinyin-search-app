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



// 导出模块
export {
  showToast,
  updateLayoutForIOS,
  preventRubberBandEffect,
  showAutoSaveIndicator,
  setupOutsideClickHandler,
  initPWA
};
