const appData = {
  files: {},
  currentFile: null,
  searchQuery: '',
  debounceTimer: null,
  autoSaveTimer: null,
  isModified: false,
  autoSaveEnabled: true,
  autoScrollOnOpen: true, // 默认开启加载后自动滚动到底部
  passwordModeEnabled: false, // 默认关闭英文键盘模式
  darkMode: 'system', // 暗色模式：'system' | 'light' | 'dark'
  autoExitMinutes: 1 // 默认 1 分钟后台自动退出
};

const listeners = [];

/**
 * 订阅状态变更
 * @param {Function} callback (patch) => void
 */
function subscribe(callback) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

/**
 * 统一更新状态并处理持久化与通知
 * @param {Object} patch 要更新的状态片段
 * @param {Object} [options] 
 * @param {boolean} [options.saveData] 是否保存文件数据 (localStorage)
 * @param {boolean} [options.saveSettings] 是否保存设置 (localStorage)
 */
function updateState(patch, options = {}) {
  Object.assign(appData, patch);
  
  if (options.saveData) {
    saveDataToLocalStorage();
  }
  if (options.saveSettings) {
    saveSettingsToLocalStorage();
  }
  
  // 通知订阅者
  listeners.forEach(cb => cb(patch));
}

function loadDataFromLocalStorage() {
  const savedData = localStorage.getItem('addressBookData');
  if (savedData) {
    appData.files = JSON.parse(savedData);
  }
  const savedSettings = localStorage.getItem('addressBookSettings');
  if (savedSettings) {
    try {
      const s = JSON.parse(savedSettings);
      if (typeof s.autoScrollOnOpen === 'boolean') {
        appData.autoScrollOnOpen = s.autoScrollOnOpen;
      }
      if (typeof s.passwordModeEnabled === 'boolean') {
        appData.passwordModeEnabled = s.passwordModeEnabled;
      }
      if (s.darkMode) {
        appData.darkMode = s.darkMode;
      }
      if (typeof s.autoExitMinutes === 'number') {
        appData.autoExitMinutes = s.autoExitMinutes;
      }
    } catch {}
  }
}

function saveDataToLocalStorage() {
  localStorage.setItem('addressBookData', JSON.stringify(appData.files));
}

function saveSettingsToLocalStorage() {
  const settings = {
    autoScrollOnOpen: appData.autoScrollOnOpen,
    passwordModeEnabled: appData.passwordModeEnabled,
    darkMode: appData.darkMode,
    autoExitMinutes: appData.autoExitMinutes
  };
  localStorage.setItem('addressBookSettings', JSON.stringify(settings));
}

function saveCurrentFile(elements) {
  if (!appData.currentFile || !appData.isModified) return;
  
  const newFiles = { ...appData.files };
  if (elements && elements.memoEditor) {
    newFiles[appData.currentFile] = {
      ...newFiles[appData.currentFile],
      content: elements.memoEditor.value,
      lastModified: new Date().getTime()
    };
  } else {
    newFiles[appData.currentFile].lastModified = new Date().getTime();
  }
  
  updateState({ 
    files: newFiles,
    isModified: false 
  }, { saveData: true });
}

function applyDarkMode(mode) {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (mode === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // system
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

function initDarkMode() {
  const saved = appData.darkMode || 'system';
  applyDarkMode(saved);
  
  // 监听系统偏好变化
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (_) => {
      if (appData.darkMode === 'system') {
        applyDarkMode('system');
      }
    });
  }
}

function setDarkMode(mode) {
  updateState({ darkMode: mode }, { saveSettings: true });
  applyDarkMode(mode);
}

export {
  appData,
  updateState,
  subscribe,
  loadDataFromLocalStorage,
  saveDataToLocalStorage,
  saveSettingsToLocalStorage,
  saveCurrentFile,
  applyDarkMode,
  initDarkMode,
  setDarkMode
};
