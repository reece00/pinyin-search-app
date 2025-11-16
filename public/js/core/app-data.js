const appData = {
  files: {}, // 存储所有文件 { filename: { content: '...', lastModified: timestamp } }
  currentFile: null, // 当前打开的文件名
  searchQuery: '', // 当前搜索关键词
  debounceTimer: null, // 防抖计时器
  autoSaveTimer: null, // 自动保存计时器
  isModified: false, // 内容是否被修改
  autoSaveEnabled: true,
  searchSpacerTimer: null // 搜索框失焦后隐藏占位的延迟计时器
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

function bindEditorToFile(content, elements) {
  if (elements && elements.memoEditor) {
    elements.memoEditor.value = content || '';
    appData.isModified = false;
  }
}

export {
  appData,
  loadDataFromLocalStorage,
  saveDataToLocalStorage,
  saveCurrentFile,
  bindEditorToFile
};
 
