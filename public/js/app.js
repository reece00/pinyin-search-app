// 导入各模块
import {
  appData, updateState, subscribe, loadDataFromLocalStorage,
  saveCurrentFile, initDarkMode, setDarkMode
} from './app-data.js';
import { files, search } from './features.js';
import {
  showToast, initErrorMonitor, openClientLogOverlay, trace,
  getLogs, onClickOutside, toggleVisibility
} from './ui-utils.js';
import { checkPWAStatus, registerServiceWorker, initAutoExit, getSWStatus } from './pwa-helper.js';

// 全局 DOM 元素引用
let elements = {};
// 存储外部点击事件处理函数引用，用于正确移除监听器
let outsideClickHandler = null;
let viewportFixRaf = null;

/**
 * 初始化版本与环境信息展示
 */
function initVersionInfo() {
  const statusBar = document.getElementById('app-status-bar');
  if (!statusBar) return;

  const buildTimeStr = window['APP_BUILD_TIME'] || '';
  const downloadTimeStr = window['APP_DOWNLOAD_TIME'] || '';

  const now = Date.now();
  let displayContent = '';
  const logInfo = {
    env: location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'local' : 'production',
    deviceId: localStorage.getItem('logDeviceId') || 'unknown'
  };

  const formatDate = (ts) => {
    if (!ts || isNaN(ts)) return null;
    const d = new Date(Number(ts));
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // 1. 处理构建时间 (优先显示)
  if (buildTimeStr && !buildTimeStr.startsWith('{{')) {
    const formatted = formatDate(buildTimeStr);
    if (formatted) {
      displayContent = `构建: ${formatted}`;
      logInfo.buildTime = new Date(Number(buildTimeStr)).toISOString();
    }
  }

  // 2. 处理下载时间 (作为补充或备选)
  if (downloadTimeStr && !downloadTimeStr.startsWith('{{')) {
    const downloadTime = Number(downloadTimeStr);
    const formatted = formatDate(downloadTime);
    if (formatted) {
      if (!displayContent) displayContent = `下载: ${formatted}`;
      logInfo.downloadTime = new Date(downloadTime).toISOString();

      // 3. 缓存检测逻辑 (超过1分钟视为可能存在缓存)
      if (Math.abs(now - downloadTime) > 60000) {
        displayContent += ' (可能存在缓存)';
        logInfo.cacheWarning = true;
      }
    }
  }

  // 更新 UI
  statusBar.textContent = displayContent;

  // 输出详细日志
  trace('SYSTEM', 'startup_info', logInfo);
}

function syncViewportHeight() {
  if (viewportFixRaf) {
    window.cancelAnimationFrame(viewportFixRaf);
  }
  viewportFixRaf = requestAnimationFrame(() => {
    const h = Math.round((window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight);
    if (h > 0 && document.body) {
      document.body.style.height = `${h}px`;
    }
    viewportFixRaf = null;
  });
}

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

// 统一退出逻辑
function handleExit() {
  console.log('执行重置程序...');
  saveCurrentFile(elements);
  if (elements.secondaryMenu) {
    elements.secondaryMenu.classList.add('hidden');
  }
  window.location.reload();
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
    elements.secondaryMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = elements.secondaryMenu.classList.contains('hidden');
      toggleVisibility(elements.secondaryMenu, isHidden);

      if (isHidden) {
        if (outsideClickHandler) outsideClickHandler();
        outsideClickHandler = onClickOutside(elements.secondaryMenu, () => {
          toggleVisibility(elements.secondaryMenu, false);
          outsideClickHandler = null;
        });
      } else {
        if (outsideClickHandler) {
          outsideClickHandler();
          outsideClickHandler = null;
        }
      }
    });
    // 菜单内部点击不触发外部关闭
    elements.secondaryMenu.addEventListener('click', (e) => e.stopPropagation());
  }

  // 菜单项行为定义
  const menuActions = {
    menuSaveBtn: () => {
      saveCurrentFile(elements);
      showToast('已保存', elements);
    },
    menuScrollOnOpenBtn: () => {
      updateState({ autoScrollOnOpen: !appData.autoScrollOnOpen }, { saveSettings: true });
    },
    menuPasswordModeBtn: () => {
      updateState({ passwordModeEnabled: !appData.passwordModeEnabled }, { saveSettings: true });
    },
    menuDarkModeBtn: () => {
      const modes = ['system', 'light', 'dark'];
      const nextMode = modes[(modes.indexOf(appData.darkMode) + 1) % modes.length];
      setDarkMode(nextMode);
    },
    menuAutoExitBtn: () => {
      const input = prompt('请输入后台自动退出时间（分钟，0表示禁用）:', String(appData.autoExitMinutes));
      if (input !== null) {
        const val = parseInt(input);
        if (!isNaN(val) && val >= 0) {
          updateState({ autoExitMinutes: val }, { saveSettings: true });
          showToast(`已设置为 ${val > 0 ? val + ' 分钟' : '禁用'} 后自动退出`, elements);
        } else {
          showToast('请输入有效的数字', elements);
        }
      }
    },
    menuExitBtn: () => handleExit(),
    menuRenameFileBtn: () => files.handleRenameFile(elements),
    menuNewFileBtn: () => files.handleNewFile(elements),
    menuDeleteBtn: () => appData.currentFile && files.handleDeleteFile(appData.currentFile, elements),
    menuPasteBtn: () => files.handleImportClipboard(elements),
    menuRenameResetBtn: () => files.handleResetFilename(elements),
    menuSyncBtn: () => {
      import('./webdav.js').then(({ runWebDavSync }) => runWebDavSync())
        .catch(e => console.error('加载同步模块失败', e));
    },
    menuLogPanelBtn: () => openClientLogOverlay(),
    menuLoadFontBtn: () => {
      if (document.body.classList.contains('no-custom-font')) {
        document.body.classList.remove('no-custom-font');
        elements.menuLoadFontBtn.disabled = true;
        elements.menuLoadFontBtn.textContent = '已加载';
      }
    },
    menuLoadExampleBtn: () => files.handleLoadExample(elements)
  };

  // 批量绑定菜单项
  Object.entries(menuActions).forEach(([id, action]) => {
    if (elements[id]) {
      elements[id].addEventListener('click', () => {
        action();
        toggleVisibility(elements.secondaryMenu, false);
        if (outsideClickHandler) {
          outsideClickHandler();
          outsideClickHandler = null;
        }
      });
    }
  });
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

/**
 * 响应式更新 UI
 */
function setupUIObservers() {
  const darkModeLabels = { system: '自动', light: '浅色', dark: '深色' };

  const updateUI = (patch) => {
    // 自动滚底部标签
    if ('autoScrollOnOpen' in patch) {
      if (elements.menuScrollOnOpenVal) {
        elements.menuScrollOnOpenVal.textContent = patch.autoScrollOnOpen ? '开' : '关';
      }
    }

    // 英文键盘模式
    if ('passwordModeEnabled' in patch) {
      const isEnabled = patch.passwordModeEnabled;
      if (elements.menuPasswordModeVal) {
        elements.menuPasswordModeVal.textContent = isEnabled ? '开' : '关';
      }
      if (elements.searchInput) {
        elements.searchInput.type = isEnabled ? 'password' : 'text';
      }
    }

    // 暗色模式标签
    if ('darkMode' in patch) {
      if (elements.menuDarkModeVal) {
        elements.menuDarkModeVal.textContent = darkModeLabels[patch.darkMode];
      }
    }

    // 自动退出时间标签
    if ('autoExitMinutes' in patch) {
      const mins = patch.autoExitMinutes;
      if (elements.menuAutoExitVal) {
        elements.menuAutoExitVal.textContent = mins > 0 ? mins + '分钟' : '已禁用';
      }
    }
  };

  subscribe(updateUI);

  // 初始同步 UI
  updateUI({
    autoScrollOnOpen: appData.autoScrollOnOpen,
    passwordModeEnabled: appData.passwordModeEnabled,
    darkMode: appData.darkMode,
    autoExitMinutes: appData.autoExitMinutes
  });
}

// 初始化应用
function initApp() {
  initErrorMonitor({ overlay: true, levels: ['error','warn','log','info','debug'], trigger: 'menu' });
  console.log('正在初始化应用...');

  // 获取 DOM 元素引用
  elements = {
    memoEditor: document.getElementById('memo-editor'),
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
    menuDarkModeVal: document.getElementById('menu-dark-mode-val'),
    menuAutoExitBtn: document.getElementById('menu-auto-exit-btn'),
    menuAutoExitVal: document.getElementById('menu-auto-exit-val'),
    menuScrollOnOpenVal: document.getElementById('menu-scroll-on-open-val'),
    menuPasswordModeVal: document.getElementById('menu-password-mode-val'),
    menuExitBtn: document.getElementById('menu-exit-btn'),
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

  // 初始化 UI 观察者
  setupUIObservers();

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

  // 初始化版本与状态展示
  initVersionInfo();

  // PWA 与后台退出处理
  const isPWA = checkPWAStatus();
  if (isPWA) {
    syncViewportHeight();
    requestAnimationFrame(() => syncViewportHeight());
    setTimeout(() => syncViewportHeight(), 120);
    window.addEventListener('resize', syncViewportHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewportHeight);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        syncViewportHeight();
        setTimeout(() => syncViewportHeight(), 120);
      }
    });
    if (appData.autoExitMinutes > 0) {
      initAutoExit(appData.autoExitMinutes, handleExit);
    }
  }

  // 始终尝试注册或清理 SW (内部会判断 PWA/Debug 状态)
  registerServiceWorker();

  console.log('应用初始化完成');

  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(location.hostname) ||
                  /^192\.168\./.test(location.hostname) ||
                  /^10\./.test(location.hostname) ||
                  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(location.hostname);
  const searchParams = new URLSearchParams(location.search);
  const isDebugParamEnabled = ['1', 'true', 'yes'].includes((searchParams.get('debug') || '').toLowerCase());
  const isDebugMode = isLocal || isDebugParamEnabled;

  if (isDebugMode) {
    globalThis.__DEV__ = {
      appData,
      elements,
      performSearch: (q) => {
        if (elements.searchInput) {
          elements.searchInput.value = q;
          search.handleSearchInput(elements);
        }
      },
      getState: () => ({
        currentFile: appData.currentFile,
        filesCount: Object.keys(appData.files || {}).length,
        searchQuery: appData.searchQuery,
        swStatus: getSWStatus(),
        viewport: {
          w: window.innerWidth,
          h: window.innerHeight,
          vwH: window.visualViewport ? window.visualViewport.height : null
        }
      }),
      diagnose: () => {
        const state = globalThis.__DEV__.getState();
        const logs = getLogs(20);
        const report = {
          timestamp: new Date().toISOString(),
          appState: state,
          lastLogs: logs.map(l => `[${l.level}] ${l.message}`),
          domStatus: {
            editorHidden: elements.editorPage.classList.contains('hidden'),
            searchHidden: elements.searchResultsPage.classList.contains('hidden'),
            menuHidden: elements.secondaryMenu ? elements.secondaryMenu.classList.contains('hidden') : true
          }
        };
        console.log('[DIAGNOSE] Snapshot:', report);
        return report;
      },
      trace
    };
    trace('DEBUG', 'hook_enabled', { hostname: location.hostname, debugParam: isDebugParamEnabled, swStatus: getSWStatus() });
  } else if ('__DEV__' in globalThis) {
    try {
      delete globalThis.__DEV__;
    } catch {
      globalThis.__DEV__ = undefined;
    }
    trace('DEBUG', 'hook_disabled', { hostname: location.hostname });
  }

  if (isDebugMode) {
    globalThis.__DEV__.search = globalThis.__DEV__.performSearch;
  }
}

// 导出初始化函数（通过全局对象挂载，规避类型检查限制）
globalThis['initApp'] = initApp;

// 导出全局引用以便调试
export { elements, appData };
