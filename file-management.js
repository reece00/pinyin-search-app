import { appData, saveDataToLocalStorage, bindEditorToFile } from './app-data.js';
import { clearSearchInput } from './search-functionality.js';
import { showToast } from './ui-utils.js';

// 创建新文件
function createNewFile(elements) {
  const timestamp = new Date().getTime();
  
  // 查找最大的备忘录序号
  let maxNumber = 0;
  for (const filename in appData.files) {
    const match = filename.match(/^新备忘录(\d+)$/);
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  }
  
  // 生成新的文件名
  const defaultName = `新备忘录${maxNumber + 1}`;
  
  appData.files[defaultName] = {
    content: '',
    lastModified: timestamp
  };
  saveDataToLocalStorage();
  openFile(defaultName, elements);
  showToast('新文件已创建', elements);
}

// 打开文件
function openFile(filename, elements) {
  if (!appData.files[filename]) return;
  
  // 检查当前文件是否有未保存的更改
  if (appData.currentFile && appData.isModified) {
    // 使用浏览器原生confirm弹窗
    if (confirm('当前文件有未保存的更改，是否继续？')) {
      doOpenFile(filename, elements);
    }
  } else {
    doOpenFile(filename, elements);
  }
}

// 执行打开文件操作
function doOpenFile(filename, elements) {
  // 更新文件最后修改时间
  appData.files[filename].lastModified = new Date().getTime();
  
  // 将编辑器与文件绑定
  bindEditorToFile(appData.files[filename].content, elements);
  
  // 更新当前文件
  appData.currentFile = filename;
  appData.isModified = false;
  
  // 显示当前文件名
  elements.filenameDisplay.textContent = filename;
  
  // 保存数据
  saveDataToLocalStorage();
  
  // 清除搜索
  clearSearchInput(elements);
  
  // 关闭文件弹窗
  closeFilePopup(elements);
}

// 处理新建文件
function handleNewFile(elements) {
  // 检查当前文件是否有未保存的更改
  if (appData.currentFile && appData.isModified) {
    // 使用浏览器原生confirm弹窗
    if (confirm('当前文件有未保存的更改，是否继续创建新文件？')) {
      createNewFile(elements);
    }
  } else {
    createNewFile(elements);
  }
}

// 处理删除文件
function handleDeleteFile(filename, elements) {
  // 如果是当前打开的文件，需要先关闭
  if (appData.currentFile === filename) {
    // 如果文件只有一个，不允许删除
    if (Object.keys(appData.files).length === 1) {
      showToast('至少需要保留一个文件', elements);
      return;
    }
    
    // 使用浏览器原生confirm弹窗
    if (confirm(`删除"${filename}"后，所有内容将丢失`)) {
      // 执行删除
      delete appData.files[filename];
      saveDataToLocalStorage();
      
      const recentFiles = Object.keys(appData.files).sort((a, b) => {
        return appData.files[b].lastModified - appData.files[a].lastModified;
      });
      
      if (recentFiles.length > 0) {
        openFile(recentFiles[0], elements);
      } else {
        createNewFile(elements);
      }
      
      closeFilePopup(elements);
      showToast('文件已删除', elements);
    }
  } else {
    // 使用浏览器原生confirm弹窗
    if (confirm(`删除"${filename}"后，所有内容将丢失`)) {
      // 执行删除
      delete appData.files[filename];
      saveDataToLocalStorage();
      renderFileList(elements);
      showToast('文件已删除', elements);
    }
  }
}

// 处理文件重命名
function handleRenameFile(elements) {
  if (!appData.currentFile) {
    showToast('没有当前打开的文件', elements);
    return;
  }
  
  const newFileName = prompt('请输入新的文件名:', appData.currentFile);
  
  if (newFileName === null) {
    // 用户取消操作
    return;
  }
  
  const trimmedName = newFileName.trim();
  
  if (!trimmedName) {
    showToast('文件名不能为空', elements);
    return;
  }
  
  if (trimmedName === appData.currentFile) {
    // 文件名没有变化
    return;
  }
  
  if (appData.files[trimmedName]) {
    showToast('文件名已存在', elements);
    return;
  }
  
  // 重命名文件
  appData.files[trimmedName] = appData.files[appData.currentFile];
  delete appData.files[appData.currentFile];
  
  // 更新当前文件名
  appData.currentFile = trimmedName;
  
  // 保存数据
  saveDataToLocalStorage();
  showToast('文件已重命名', elements);
}

// 切换文件弹窗
function toggleFilePopup(elements) {
  if (elements.filePopup) {
    elements.filePopup.classList.toggle('hidden');
    if (!elements.filePopup.classList.contains('hidden')) {
      renderFileList(elements);
    }
  } else {
    console.error('filePopup element not found');
  }
}

// 关闭文件弹窗
function closeFilePopup(elements) {
  console.log('Closing file popup');
  if (elements.filePopup) {
    // 确保弹窗被正确隐藏
    elements.filePopup.classList.add('hidden');
    // 可选：添加过渡效果
    elements.filePopup.style.transition = 'opacity 0.2s ease';
    elements.filePopup.style.opacity = '0';
    setTimeout(() => {
      elements.filePopup.style.opacity = '1';
    }, 200);
  } else {
    console.error('filePopup element not found');
  }
}

// 渲染文件列表
function renderFileList(elements) {
  if (!elements.fileList) {
    console.error('fileList element not found');
    return;
  }
  
  elements.fileList.innerHTML = '';
  
  // 保持文件顺序固定，不进行排序
  const files = Object.keys(appData.files);
  
  files.forEach(filename => {
    const fileItem = document.createElement('div');
    fileItem.className = `p-3 rounded-lg flex justify-between items-center ${appData.currentFile === filename ? 'bg-blue-50 text-primary' : 'hover:bg-gray-50 cursor-pointer'}`;
    
    // 点击行切换文件
    if (appData.currentFile !== filename) {
      fileItem.addEventListener('click', () => {
        openFile(filename, elements);
        closeFilePopup(elements);
      });
    }
    
    const fileInfo = document.createElement('div');
    fileInfo.className = 'flex items-center';
    
    const fileIcon = document.createElement('i');
    fileIcon.className = 'fa fa-file-text-o mr-3';
    
    const fileName = document.createElement('div');
    fileName.className = 'text-sm';
    fileName.textContent = filename;
    
    fileInfo.appendChild(fileIcon);
    fileInfo.appendChild(fileName);
    
    const fileActions = document.createElement('div');
    fileActions.className = 'flex items-center space-x-2';
    
    if (appData.currentFile === filename) {
      const currentBadge = document.createElement('span');
      currentBadge.className = 'text-xs bg-primary text-white px-2 py-1 rounded-full';
      currentBadge.textContent = '当前';
      fileActions.appendChild(currentBadge);
    }
    
    // 添加删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'text-xs text-red-500';
    deleteBtn.textContent = '删除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteFile(filename, elements);
    });
    fileActions.appendChild(deleteBtn);
    
    fileItem.appendChild(fileInfo);
    fileItem.appendChild(fileActions);
    
    elements.fileList.appendChild(fileItem);
  });
}

// 处理导入剪切板
function handleImportClipboard(elements) {
  showToast('准备导入剪贴板内容...', elements);
  
  if (!navigator.clipboard) {
    showToast('您的浏览器不支持剪贴板功能', elements);
    return;
  }
  
  // 在移动设备上添加额外的错误处理
  navigator.clipboard.readText()
    .then(text => {
      if (!text.trim()) {
        showToast('剪切板为空', elements);
        return;
      }
      
      // 获取文本的第一行作为文件名预览
      const firstLine = text.split('\n')[0].trim();
      let fileNamePreview = sanitizeFileName(firstLine);
      if (!fileNamePreview || fileNamePreview.length < 2) {
        fileNamePreview = '新备忘录';
      }
      
      // 使用浏览器原生confirm弹窗，简化提示信息
      if (confirm('是否使用剪切板内容创建新文件？')) {
        doImportClipboard(text, elements);
      }
    })
    .catch(err => {
      console.error('无法读取剪切板:', err);
      // 提供更具体的错误信息
      if (err.name === 'NotAllowedError') {
        showToast('需要权限才能访问剪贴板，请确保应用在安全环境中运行', elements);
      } else {
        showToast('读取剪切板失败，请重试或手动粘贴内容', elements);
      }
    });
}

// 执行导入剪切板操作
function doImportClipboard(text, elements) {
  const timestamp = new Date().getTime();
  
  // 获取文本的第一行作为文件名
  const firstLine = text.split('\n')[0].trim();
  
  // 处理文件名，去除特殊字符，限制长度
  let fileName = sanitizeFileName(firstLine);
  
  // 如果第一行处理后为空或太短，使用默认名称
  if (!fileName || fileName.length < 2) {
    fileName = `新备忘录_${timestamp}`;
  }
  
  // 检查文件名是否已存在，如果存在则添加序号
  let finalFileName = fileName;
  let counter = 1;
  while (appData.files[finalFileName]) {
    finalFileName = `${fileName}_${counter}`;
    counter++;
  }
  
  // 创建新文件
  appData.files[finalFileName] = {
    content: text,
    lastModified: timestamp
  };
  
  // 保存数据
  saveDataToLocalStorage();
  
  // 打开新创建的文件
  openFile(finalFileName, elements);
  showToast(`已从剪切板创建新文件: ${finalFileName}`, elements);
}

// 清理文件名字符，去除不允许的字符
function sanitizeFileName(name) {
  // 去除路径分隔符和其他不允许的字符
  // 只保留字母、数字、中文和常见标点符号
  return name.replace(/[\\/:*?"<>|]/g, '').trim()
    // 限制文件名长度，防止过长
    .substring(0, 50);
}

// 导出模块
export {
  createNewFile,
  openFile,
  handleNewFile,
  handleDeleteFile,
  handleRenameFile,
  toggleFilePopup,
  closeFilePopup,
  renderFileList,
  handleImportClipboard
};
