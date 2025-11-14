// 导入各模块
import { appData, loadDataFromLocalStorage, saveDataToLocalStorage, saveCurrentFile, bindEditorToFile } from './app-data.js';
import { runWebDavSync } from './sync-webdav.js';
import { 
  toggleFilePopup, closeFilePopup, handleDeleteFile, 
  handleNewFile, createNewFile, openFile, 
  handleRenameFile, handleImportClipboard,
  renderFileList 
} from './file-management.js';
import { 
  performSearch, showSearchResultsPage, showEditorPage,
  handleSearchInput, handleSearchFocus,
  clearSearchInput, scrollToAddress
} from './search-functionality.js';
import { 
  showToast, updateLayoutForIOS, preventRubberBandEffect,
  showAutoSaveIndicator, setupOutsideClickHandler, initPWA
} from './ui-utils.js';

// 全局DOM元素引用
let elements = {};

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
      showAutoSaveIndicator(elements);
    }, 1000); // 1秒后自动保存
  }
  
  // 记录编辑器状态
  appData.isModified = true;
}

// 绑定所有事件
function bindEvents() {
  // 文件操作事件
  elements.fileButton.addEventListener('click', () => toggleFilePopup(elements));
  elements.closeFilePopup.addEventListener('click', () => closeFilePopup(elements));
  elements.newFileButton.addEventListener('click', () => handleNewFile(elements));
  elements.importClipboardButton.addEventListener('click', () => handleImportClipboard(elements));
  elements.renameFileButton.addEventListener('click', () => handleRenameFile(elements));
  if (elements.secondaryMenuBtn && elements.secondaryMenu) {
    // 阻止按钮点击事件冒泡，避免立即触发外部关闭
    elements.secondaryMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.secondaryMenu.classList.toggle('hidden');
      if (!elements.secondaryMenu.classList.contains('hidden')) {
        // 延迟绑定外部点击关闭，避免本次点击被捕获
        setTimeout(() => {
          setupOutsideClickHandler(elements.secondaryMenu, () => {
            elements.secondaryMenu.classList.add('hidden');
          });
        }, 0);
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
  if (elements.menuSyncBtn && elements.secondaryMenu) {
    elements.menuSyncBtn.addEventListener('click', () => {
      runWebDavSync();
      elements.secondaryMenu.classList.add('hidden');
    });
  }
  elements.searchInput.addEventListener('input', () => handleSearchInput(elements));
  elements.searchInput.addEventListener('focus', () => handleSearchFocus(elements));
  elements.clearInputBtn.addEventListener('click', () => clearSearchInput(elements));
  // 顶部搜索框已移除，无需绑定其输入事件
  // 顶部搜索框已移除，清空按钮逻辑不再绑定
  elements.memoEditor.addEventListener('input', handleEditorInput);
  elements.closeSearchResultsButton.addEventListener('click', () => showEditorPage(elements));
  
  // 阻止点击弹窗内元素时关闭弹窗
  elements.filePopup.addEventListener('click', (e) => e.stopPropagation());
  
  // 绑定文件列表点击事件（由renderFileList函数内部绑定）
}

// 初始化应用
function initApp() {
  console.log('正在初始化应用...');
  
  // 获取DOM元素引用
  elements = {
    memoEditor: document.getElementById('memo-editor'),
    fileButton: document.getElementById('file-switch-btn'),
    filePopup: document.getElementById('file-popup'),
    closeFilePopup: document.getElementById('close-file-popup'),
    fileList: document.getElementById('file-list'),
    newFileButton: document.getElementById('new-file-btn'),
    importClipboardButton: document.getElementById('import-clipboard-btn'),
    renameFileButton: document.getElementById('rename-file-btn'),
    secondaryMenuBtn: document.getElementById('secondary-menu-btn'),
    secondaryMenu: document.getElementById('secondary-menu'),
    menuSaveBtn: document.getElementById('menu-save-btn'),
    menuSyncBtn: document.getElementById('menu-sync-btn'),
    searchInput: document.getElementById('search-input'),
    clearInputBtn: document.getElementById('clear-input-btn'),
    toastMessage: document.getElementById('toast'),
    editorPage: document.getElementById('editor-page'),
    searchResultsPage: document.getElementById('search-results-page'),
    searchResultsList: document.getElementById('search-results-list'),
    closeSearchResultsButton: document.getElementById('close-search-results'),
    resultsCount: document.getElementById('results-count'),
    noResultsMessage: document.getElementById('no-results-message'),
    autoSaveIndicator: document.getElementById('auto-save-indicator'),
    actionButtonsContainer: document.getElementById('action-buttons-container'),
    filenameDisplay: document.getElementById('filename-display'),
    memoEditor: document.getElementById('memo-editor')
  };
  
  // 加载数据
  loadDataFromLocalStorage();
  
  // 渲染文件列表
  renderFileList(elements);
  
  // 打开最后编辑的文件；如果没有则打开第一个文件；如果没有任何文件则新建
  const fileKeys = Object.keys(appData.files);
  if (appData.currentFile && appData.files[appData.currentFile]) {
    openFile(appData.currentFile, elements);
  } else if (fileKeys.length > 0) {
    openFile(fileKeys[0], elements);
  } else {
    createNewFile(elements);
  }
  
  // 绑定事件
  bindEvents();
  
  // 适配iOS布局
  updateLayoutForIOS(elements);
  
  // 阻止橡皮筋效果
  preventRubberBandEffect();
  
  // 初始化PWA
  initPWA();
  
  console.log('应用初始化完成');
}

// 导出初始化函数
window.initApp = initApp;

// 导出全局引用以便调试
export { elements, appData };
