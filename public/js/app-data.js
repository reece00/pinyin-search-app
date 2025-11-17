const appData = {
  files: {},
  currentFile: null,
  searchQuery: '',
  debounceTimer: null,
  autoSaveTimer: null,
  isModified: false,
  autoSaveEnabled: true,
  searchSpacerTimer: null
};

function loadDataFromLocalStorage() {
  const savedData = localStorage.getItem('addressBookData');
  if (savedData) {
    appData.files = JSON.parse(savedData);
  }
}

function saveDataToLocalStorage() {
  localStorage.setItem('addressBookData', JSON.stringify(appData.files));
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
  saveCurrentFile,
  
};