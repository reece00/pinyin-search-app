// 导入各模块
import { appData, loadDataFromLocalStorage, saveCurrentFile, saveSettingsToLocalStorage, initDarkMode, setDarkMode } from './app-data.js';
import { files, search } from './features.js';
import { 
  showToast, initErrorMonitor, openClientLogOverlay
} from './ui-utils.js';

// 全局 DOM 元素引用
let elements = {};
// 存储外部点击事件处理函数引用，用于正确移除监听器
let outsideClickHandler = null;

// 处理编辑器输入
function handleEditorInput() {
  // 自动保存
  if (appData.autoSaveEnabled && appData.currentFile) {
    // 防抖处理
    if (appData.autoSaveTimer) {
      clearTimeout(appData.autoSaveTimer);
    }
  
  appData.autoSaveTimer = setTimeout(() => {
    saveCurrentFile(elements);
      if (elements && elements.autoSaveIndicator) {
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
  }, 1000); // 1秒后自动保存
  }
  
  // 记录编辑器状态
  appData.isModified = true;
}

function getFileOrder() {
  return Object.keys(appData.files);
}

function switchToPrevFile() {
  const fileNames = getFileOrder();
  if (fileNames.length <= 1) {
    showToast('只有一个文件', elements);
    return;
  }
  const idx = fileNames.indexOf(appData.currentFile);
  if (idx > 0) {
    files.openFile(fileNames[idx - 1], elements);
  } else {
    showToast('已是第一个文件', elements);
  }
}

function switchToNextFile() {
  const fileNames = getFileOrder();
  if (fileNames.length <= 1) {
    showToast('只有一个文件', elements);
    return;
  }
  const idx = fileNames.indexOf(appData.currentFile);
  if (idx >= 0 && idx < fileNames.length - 1) {
    files.openFile(fileNames[idx + 1], elements);
  } else {
    showToast('已是最后一个文件', elements);
  }
}

function setupEditorSwipe() {
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;
  let tracking = false;
  const H_THRESHOLD = 60;
  const V_LIMIT = 40;
  elements.memoEditor.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    endX = startX;
    endY = startY;
    tracking = true;
  }, { passive: true });
  elements.memoEditor.addEventListener('touchmove', (e) => {
    if (!tracking || e.touches.length !== 1) return;
    const t = e.touches[0];
    endX = t.clientX;
    endY = t.clientY;
  }, { passive: true });
  elements.memoEditor.addEventListener('touchend', () => {
    if (!tracking) return;
    tracking = false;
    const dx = endX - startX;
    const dy = endY - startY;
    if (Math.abs(dx) >= H_THRESHOLD && Math.abs(dy) <= V_LIMIT) {
      if (dx < 0) {
        switchToNextFile();
      } else if (dx > 0) {
        switchToPrevFile();
      }
    }
    startX = 0;
    startY = 0;
    endX = 0;
    endY = 0;
  });
}

  // 绑定所有事件
  function bindEvents() {
    // 文件操作事件
    elements.fileButton.addEventListener('click', () => files.toggleFilePopup(elements));
    elements.closeFilePopup.addEventListener('click', () => files.closeFilePopup(elements));
    // 快速滚动按钮
    if (elements.scrollTopButton) {
      elements.scrollTopButton.addEventListener('click', () => {
        if (elements.memoEditor) { elements.memoEditor.scrollTop = 0; }
      });
    }
    if (elements.scrollBottomButton) {
      elements.scrollBottomButton.addEventListener('click', () => {
        if (elements.memoEditor) { elements.memoEditor.scrollTop = elements.memoEditor.scrollHeight; }
      });
    }
  if (elements.prevFileButton) {
    elements.prevFileButton.addEventListener('click', () => switchToPrevFile());
  }
  if (elements.nextFileButton) {
    elements.nextFileButton.addEventListener('click', () => switchToNextFile());
  }
  if (elements.secondaryMenuBtn && elements.secondaryMenu) {
    // 阻止按钮点击事件冒泡，避免立即触发外部关闭
    elements.secondaryMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // 如果已有监听器，先移除
      if (outsideClickHandler) {
        document.removeEventListener('click', outsideClickHandler);
        outsideClickHandler = null;
      }
      elements.secondaryMenu.classList.toggle('hidden');
      if (!elements.secondaryMenu.classList.contains('hidden')) {
        // 延迟绑定外部点击关闭，避免本次点击被捕获
        setTimeout(() => {
          outsideClickHandler = function handleOutsideClick(event) {
            if (elements.secondaryMenu && !elements.secondaryMenu.contains(event.target)) {
              elements.secondaryMenu.classList.add('hidden');
              if (outsideClickHandler) {
                document.removeEventListener('click', outsideClickHandler);
                outsideClickHandler = null;
              }
            }
          };
          document.addEventListener('click', outsideClickHandler);
        }, 0);
      } else {
        // 菜单关闭时移除监听器
        if (outsideClickHandler) {
          document.removeEventListener('click', outsideClickHandler);
          outsideClickHandler = null;
        }
      }
    });
    // 菜单内部点击不触发外部关闭
    elements.secondaryMenu.addEventListener('click', (e) => e.stopPropagation());
  }
  if (elements.menuSaveBtn && elements.secondaryMenu) {
    elements.menuSaveBtn.addEventListener('click', () => {
      saveCurrentFile(elements);
      showToast('已保存', elements);
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  // 自动滚底部开关
  if (elements.menuScrollOnOpenBtn && elements.secondaryMenu) {
    const updateScrollOnOpenLabel = () => {
      elements.menuScrollOnOpenBtn.textContent = `加载后滚底部：${appData.autoScrollOnOpen ? '开' : '关'}`;
    };
    updateScrollOnOpenLabel();
    elements.menuScrollOnOpenBtn.addEventListener('click', () => {
      appData.autoScrollOnOpen = !appData.autoScrollOnOpen;
      saveSettingsToLocalStorage();
      updateScrollOnOpenLabel();
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  // 英文键盘模式（密码框）开关
  if (elements.menuPasswordModeBtn && elements.secondaryMenu) {
    const updatePasswordMode = () => {
      const isEnabled = appData.passwordModeEnabled;
      elements.menuPasswordModeBtn.textContent = `英文键盘模式：${isEnabled ? '开' : '关'}`;
      if (elements.searchInput) {
        elements.searchInput.type = isEnabled ? 'password' : 'text';
      }
    };
    // 初始状态更新
    updatePasswordMode();
    
    elements.menuPasswordModeBtn.addEventListener('click', () => {
      appData.passwordModeEnabled = !appData.passwordModeEnabled;
      saveSettingsToLocalStorage();
      updatePasswordMode();
      elements.secondaryMenu.classList.add('hidden');
    });
  }

  // 暗色模式切换
  if (elements.menuDarkModeBtn && elements.secondaryMenu) {
    const darkModeLabels = {
      system: '自动',
      light: '浅色',
      dark: '深色'
    };
    
    const updateDarkModeLabel = () => {
      elements.menuDarkModeBtn.textContent = `暗色模式：${darkModeLabels[appData.darkMode]}`;
    };
    
    updateDarkModeLabel();
    
    elements.menuDarkModeBtn.addEventListener('click', () => {
      const modes = ['system', 'light', 'dark'];
      const currentIndex = modes.indexOf(appData.darkMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      setDarkMode(nextMode);
      updateDarkModeLabel();
      elements.secondaryMenu.classList.add('hidden');
    });
  }

  if (elements.menuRenameFileBtn && elements.secondaryMenu) {
    elements.menuRenameFileBtn.addEventListener('click', () => {
      files.handleRenameFile(elements);
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  if (elements.menuNewFileBtn && elements.secondaryMenu) {
    elements.menuNewFileBtn.addEventListener('click', () => {
      files.handleNewFile(elements);
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  if (elements.menuDeleteBtn && elements.secondaryMenu) {
    elements.menuDeleteBtn.addEventListener('click', () => {
      if (appData.currentFile) {
        files.handleDeleteFile(appData.currentFile, elements);
      }
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  if (elements.menuPasteBtn && elements.secondaryMenu) {
    elements.menuPasteBtn.addEventListener('click', () => {
      files.handleImportClipboard(elements);
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  if (elements.menuRenameResetBtn && elements.secondaryMenu) {
    elements.menuRenameResetBtn.addEventListener('click', () => {
      files.handleResetFilename(elements);
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  if (elements.menuSyncBtn && elements.secondaryMenu) {
    elements.menuSyncBtn.addEventListener('click', () => {
      import('./webdav.js').then(({ runWebDavSync }) => { // 按需加载同步模块（模块相对路径，兼容子目录部署）
        runWebDavSync();
      }).catch((e) => {
        console.error('加载同步模块失败', e);
      });
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  if (elements.menuLogPanelBtn && elements.secondaryMenu) {
    elements.menuLogPanelBtn.addEventListener('click', () => {
      openClientLogOverlay();
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  if (elements.menuLoadFontBtn && elements.secondaryMenu) {
    elements.menuLoadFontBtn.addEventListener('click', () => {
      if (document.body.classList.contains('no-custom-font')) {
        document.body.classList.remove('no-custom-font');
        elements.menuLoadFontBtn.disabled = true;
        elements.menuLoadFontBtn.textContent = '已加载';
      }
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  if (elements.menuLoadExampleBtn && elements.secondaryMenu) {
    elements.menuLoadExampleBtn.addEventListener('click', () => {
      files.handleLoadExample(elements);
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  elements.searchInput.addEventListener('input', () => search.handleSearchInput(elements));
  elements.searchInput.addEventListener('focus', () => search.handleSearchFocus(elements));
  elements.clearInputBtn.addEventListener('click', () => search.clearSearchInput(elements));
  
  elements.memoEditor.addEventListener('input', handleEditorInput);
  
  elements.closeSearchResultsButton.addEventListener('click', () => search.clearSearchInput(elements));
  
  // 点击弹窗背景（backdrop）时关闭弹窗
  elements.filePopup.addEventListener('click', (e) => {
    if (e.target === elements.filePopup) {
      elements.filePopup.close();
    }
  });

  // 绑定文件列表点击事件（由renderFileList函数内部绑定）
  setupEditorSwipe();
}

// 初始化应用
function initApp() {
  initErrorMonitor({ overlay: true, levels: ['error','warn','log','info','debug'], trigger: 'menu' });
  console.log('正在初始化应用...');
  
  // 获取 DOM 元素引用
  elements = {
    memoEditor: document.getElementById('memo-editor'),
    filenameBar: document.getElementById('filename-bar'),
    appMain: document.querySelector('main'),
    appFooter: document.querySelector('footer'),
    fileButton: document.getElementById('file-switch-btn'),
    filePopup: document.getElementById('file-popup'),
    closeFilePopup: document.getElementById('close-file-popup'),
    fileList: document.getElementById('file-list'),
    prevFileButton: document.getElementById('prev-file-btn'),
    nextFileButton: document.getElementById('next-file-btn'),
    scrollTopButton: document.getElementById('scroll-top-btn'),
    scrollBottomButton: document.getElementById('scroll-bottom-btn'),
    secondaryMenuBtn: document.getElementById('secondary-menu-btn'),
    secondaryMenu: document.getElementById('secondary-menu'),
    menuScrollOnOpenBtn: document.getElementById('menu-scroll-on-open-btn'),
    menuPasswordModeBtn: document.getElementById('menu-password-mode-btn'),
    menuRenameFileBtn: document.getElementById('menu-rename-file-btn'),
    menuNewFileBtn: document.getElementById('menu-new-file-btn'),
    menuDeleteBtn: document.getElementById('menu-delete-btn'),
    menuSaveBtn: document.getElementById('menu-save-btn'),
    menuPasteBtn: document.getElementById('menu-paste-btn'),
    menuRenameResetBtn: document.getElementById('menu-rename-reset-btn'),
    menuSyncBtn: document.getElementById('menu-sync-btn'),
    menuLogPanelBtn: document.getElementById('menu-log-panel-btn'),
    menuLoadFontBtn: document.getElementById('menu-load-font-btn'),
    menuLoadExampleBtn: document.getElementById('menu-load-example-btn'),
    menuDarkModeBtn: document.getElementById('menu-dark-mode-btn'),
    searchInput: document.getElementById('search-input'),
    clearInputBtn: document.getElementById('clear-input-btn'),
    toastMessage: document.getElementById('toast'),
    editorPage: document.getElementById('editor-page'),
    searchResultsPage: document.getElementById('search-results-page'),
    searchResultsList: document.getElementById('search-results-list'),
    closeSearchResultsButton: document.getElementById('close-search-results'),
    searchResultsCloseContainer: document.getElementById('search-results-close-container'),
    resultsCount: document.getElementById('results-count'),
    noResultsMessage: document.getElementById('no-results-message'),
    autoSaveIndicator: document.getElementById('auto-save-indicator'),
    actionButtonsContainer: document.getElementById('action-buttons-container'),
    filenameDisplay: document.getElementById('filename-display'),
    
  };
  
  // 加载数据
  loadDataFromLocalStorage();
  
  // 初始化暗色模式
  initDarkMode();
  
  // 渲染文件列表
  files.renderFileList(elements);
  
  // 打开最后编辑的文件；如果没有则打开第一个文件；如果没有任何文件则新建
  const fileKeys = Object.keys(appData.files);
  if (appData.currentFile && appData.files[appData.currentFile]) {
    files.openFile(appData.currentFile, elements);
  } else if (fileKeys.length > 0) {
    files.openFile(fileKeys[0], elements);
  } else {
    // 如果没有任何文件，则加载示例数据
    files.handleLoadExample(elements);
  }
  
  // 绑定事件
  bindEvents();
  
  // 初始化 PWA 注册与安装提示（仅在 PWA 安装形态注册 SW）
  const isPWAInstalled = (() => {
    const isStandalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = typeof navigator !== 'undefined' && /** @type {any} */(navigator).standalone === true;
    return !!(isStandalone || isIOSStandalone);
  })();

  const isSecure = typeof window !== 'undefined' && !!window.isSecureContext;
  if (isPWAInstalled && 'serviceWorker' in navigator && isSecure) {
    const registerSW = () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(registration => { console.log('Service Worker 注册成功:', registration.scope); })
        .catch(error => { console.log('Service Worker 注册失败:', error); });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker 已接管页面（PWA）');
      });

      navigator.serviceWorker.ready.then(() => {
        if (navigator.serviceWorker.controller) {
          console.log('Service Worker 已就绪（PWA）');
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      registerSW()
    } else {
      window.addEventListener('load', registerSW)
    }
  }
  
  console.log('应用初始化完成');
}

// 导出初始化函数（通过全局对象挂载，规避类型检查限制）
globalThis['initApp'] = initApp;

// 导出全局引用以便调试
export { elements, appData };
