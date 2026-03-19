const appData = {
  files: {},
  currentFile: null,
  searchQuery: '',
  debounceTimer: null,
  autoSaveTimer: null,
  isModified: false,
  autoSaveEnabled: true,
  autoScrollOnOpen: true, // 默认开启加载后自动滚动到底部
  passwordModeEnabled: false // 默认关闭英文键盘模式
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
    } catch {}
  }
}

function saveDataToLocalStorage() {
  localStorage.setItem('addressBookData', JSON.stringify(appData.files));
}

function saveSettingsToLocalStorage() {
  const settings = {
    autoScrollOnOpen: appData.autoScrollOnOpen,
    passwordModeEnabled: appData.passwordModeEnabled
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

export {
  appData,
  loadDataFromLocalStorage,
  saveDataToLocalStorage,
  saveSettingsToLocalStorage,
  saveCurrentFile
};
