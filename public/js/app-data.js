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
  if (elements && elements.memoEditor) {
    appData.files[appData.currentFile].content = elements.memoEditor.value;
  }
  appData.files[appData.currentFile].lastModified = new Date().getTime();
  saveDataToLocalStorage();
  appData.isModified = false;
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
  appData.darkMode = mode;
  saveSettingsToLocalStorage();
  applyDarkMode(mode);
}

export {
  appData,
  loadDataFromLocalStorage,
  saveDataToLocalStorage,
  saveSettingsToLocalStorage,
  saveCurrentFile,
  applyDarkMode,
  initDarkMode,
  setDarkMode
};
