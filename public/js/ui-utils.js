function showToast(message, elements) {
  if (!elements || !elements.toastMessage) {
    console.error('未找到toast元素');
    return;
  }
  const toastContainer = elements.toastMessage;
  const messageEl = toastContainer.querySelector('#toast-message');
  if (!messageEl) {
    console.error('未找到toast消息元素');
    return;
  }
  messageEl.textContent = message;
  toastContainer.classList.remove('hidden');
  toastContainer.classList.remove('opacity-0');
  toastContainer.classList.add('opacity-100');
  setTimeout(() => {
    toastContainer.classList.remove('opacity-100');
    toastContainer.classList.add('opacity-0');
    setTimeout(() => {
      messageEl.textContent = '';
      toastContainer.classList.add('hidden');
    }, 300);
  }, 3000);
}

function updateLayoutForIOS(elements) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
  if (isIOS) {
    document.documentElement.classList.add('ios-device');
    if (elements.actionButtonsContainer) {
      elements.actionButtonsContainer.classList.add('ios-bottom-padding');
    }
    if (elements.searchResultsPage) {
      const searchResultsBottom = elements.searchResultsPage.querySelector('#search-results-bottom');
      if (searchResultsBottom) {
        searchResultsBottom.classList.add('ios-bottom-padding');
      }
    }
  }
}

function preventRubberBandEffect() {
  let startY;
  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    let currentScrollElement;
    const docScrollEl = document.scrollingElement || document.body;
    if (docScrollEl.scrollTop > 0 || document.body.scrollTop > 0) {
      currentScrollElement = docScrollEl;
    } else {
      const tgt = e.target;
      if (tgt && tgt.nodeType === 1) {
        currentScrollElement = tgt;
        while (
          currentScrollElement !== document.body &&
          currentScrollElement && currentScrollElement.nodeType === 1 &&
          !currentScrollElement.scrollTop
        ) {
          currentScrollElement = currentScrollElement.parentElement || document.body;
        }
      } else {
        currentScrollElement = docScrollEl;
      }
    }
    const currentY = e.touches[0].clientY;
    const scrollDirection = currentY > startY ? 'up' : 'down';
    startY = currentY;
    if (
      (currentScrollElement.scrollTop === 0 && scrollDirection === 'up') ||
      (currentScrollElement.scrollHeight - currentScrollElement.scrollTop === currentScrollElement.clientHeight && scrollDirection === 'down')
    ) {
      e.preventDefault();
    }
  }, { passive: false });
}

function showAutoSaveIndicator(elements) {
  if (!elements || !elements.autoSaveIndicator) {
    console.error('未找到自动保存提示元素');
    return;
  }
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

function setupOutsideClickHandler(element, closeCallback) {
  document.addEventListener('click', function handleOutsideClick(event) {
    if (element && !element.contains(event.target)) {
      closeCallback();
      document.removeEventListener('click', handleOutsideClick);
    }
  });
}

function initPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(registration => { console.log('Service Worker 注册成功:', registration.scope); })
        .catch(error => { console.log('Service Worker 注册失败:', error); });
      navigator.serviceWorker.addEventListener('controllerchange', () => { window.location.reload(); });
      navigator.serviceWorker.ready.then(() => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  }
  let deferredPrompt;
  const addBtn = document.querySelector('#install-button');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (addBtn) { addBtn.classList.remove('hidden'); }
  });
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`用户选择: ${outcome}`);
      deferredPrompt = null;
      addBtn.classList.add('hidden');
    });
  }
}

export {
  showToast,
  updateLayoutForIOS,
  preventRubberBandEffect,
  showAutoSaveIndicator,
  setupOutsideClickHandler,
  initPWA
}
