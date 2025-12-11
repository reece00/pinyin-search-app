const appData = {
  files: {},
  currentFile: null,
  searchQuery: '',
  debounceTimer: null,
  autoSaveTimer: null,
  isModified: false,
  autoSaveEnabled: true,
  searchSpacerTimer: null,
  autoScrollOnOpen: true
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
    } catch (_) {}
  }
}

function saveDataToLocalStorage() {
  localStorage.setItem('addressBookData', JSON.stringify(appData.files));
}

function saveSettingsToLocalStorage() {
  const settings = { autoScrollOnOpen: appData.autoScrollOnOpen };
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
  saveCurrentFile,
  
};
