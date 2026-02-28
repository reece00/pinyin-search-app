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
  const getScrollableAncestor = (target) => {
    let el = target && target.nodeType === 1 ? target : null;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      const overflowY = style.overflowY;
      const canScroll = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && el.scrollHeight > el.clientHeight;
      if (canScroll) return el;
      el = el.parentElement;
    }
    const docScrollEl = document.scrollingElement || document.body;
    if (docScrollEl && docScrollEl.scrollHeight > docScrollEl.clientHeight) return docScrollEl;
    return null;
  };
  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    startY = currentY;
    const scrollEl = getScrollableAncestor(e.target);
    if (!scrollEl) {
      e.preventDefault();
      return;
    }
    if (scrollEl.id === 'memo-editor' || scrollEl.id === 'search-results-list') {
      return;
    }
    const atTop = scrollEl.scrollTop <= 0;
    const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1;
    const pullingDown = deltaY > 0;
    const pushingUp = deltaY < 0;
    if ((atTop && pullingDown) || (atBottom && pushingUp)) {
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

let __logDeviceId = localStorage.getItem('logDeviceId');
if (!__logDeviceId) {
  __logDeviceId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('logDeviceId', __logDeviceId);
}

let __logStore = [];

function __normalizeArgs(args) {
  try {
    return args.map(a => {
      if (a instanceof Error) return { message: a.message, stack: a.stack };
      if (typeof a === 'object') return JSON.stringify(a);
      return String(a);
    }).join(' ');
  } catch {
    return args.map(a => String(a)).join(' ');
  }
}

function __buildRecord(level, args) {
  const now = new Date();
  let stack;
  for (const a of args) {
    if (a && a.stack) { stack = a.stack; break; }
  }
  return {
    level,
    message: __normalizeArgs(args),
    stack: stack || '',
    url: location.href,
    ua: navigator.userAgent,
    ts: now.toISOString(),
    device: __logDeviceId
  };
}

function initErrorMonitor(options = {}) {
  const endpoint = options.endpoint || './__client-logs';
  const enableOverlay = options.overlay !== false;
  const levels = Array.isArray(options.levels) && options.levels.length ? new Set(options.levels) : new Set(['error','warn']);
  const disableSend = !!options.disableSend;
  const trigger = options.trigger || 'menu';
  const origLog = console.log.bind(console);
  const origInfo = console.info ? console.info.bind(console) : (..._args) => {};
  const origDebug = console.debug ? console.debug.bind(console) : (..._args) => {};
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  function push(rec) {
    __logStore.push(rec);
    if (__logStore.length > 1000) __logStore.splice(0, __logStore.length - 1000);
  }

  function send(record) {
    if (disableSend) return;
    try {
      const data = JSON.stringify(record);
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } else {
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true }).catch(() => {});
      }
    } catch {}
  }

  function wrap(methodName, level, orig) {
    if (!orig || typeof orig !== 'function') return;
    console[methodName] = function(...args) {
      if (levels.has(level)) {
        const rec = __buildRecord(level, args);
        push(rec);
        send(rec);
      }
      orig(...args);
    };
  }

  wrap('error', 'error', origError);
  wrap('warn', 'warn', origWarn);
  wrap('log', 'log', origLog);
  wrap('info', 'info', origInfo);
  wrap('debug', 'debug', origDebug);

  window.addEventListener('error', function(e) {
    const args = [];
    if (e.error) args.push(e.error); else args.push(e.message || 'error');
    const rec = __buildRecord('error', args);
    push(rec);
    send(rec);
  });
  window.addEventListener('unhandledrejection', function(e) {
    const r = e && e.reason ? e.reason : 'unhandledrejection';
    const rec = __buildRecord('error', [r]);
    push(rec);
    send(rec);
  });

  if (enableOverlay) {
    if (trigger === 'tripleTap') {
      let tapCount = 0;
      let lastTap = 0;
      window.addEventListener('touchstart', function() {
        const now = Date.now();
        if (now - lastTap < 800) tapCount += 1; else tapCount = 1;
        lastTap = now;
        if (tapCount >= 3) {
          tapCount = 0;
          openClientLogOverlay();
        }
      }, { passive: true });
    }
  }
}

export {
  showToast,
  updateLayoutForIOS,
  preventRubberBandEffect,
  showAutoSaveIndicator,
  setupOutsideClickHandler,
  initPWA,
  initErrorMonitor
}

function openClientLogOverlay() {
  if (document.getElementById('client-log-overlay')) return;
  const wrap = document.createElement('div');
  wrap.id = 'client-log-overlay';
  wrap.style.position = 'fixed';
  wrap.style.top = '0';
  wrap.style.left = '0';
  wrap.style.right = '0';
  wrap.style.bottom = '0';
  wrap.style.background = 'rgba(0,0,0,0.6)';
  wrap.style.zIndex = '9999';
  wrap.style.backdropFilter = 'blur(2px)';
  const panel = document.createElement('div');
  panel.style.position = 'absolute';
  panel.style.top = '10%';
  panel.style.left = '5%';
  panel.style.right = '5%';
  panel.style.bottom = '10%';
  panel.style.background = '#fff';
  panel.style.borderRadius = '12px';
  panel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  const bar = document.createElement('div');
  bar.style.display = 'flex';
  bar.style.justifyContent = 'space-between';
  bar.style.alignItems = 'center';
  bar.style.padding = '10px 12px';
  const title = document.createElement('div');
  title.textContent = '客户端日志';
  title.style.fontSize = '16px';
  const btns = document.createElement('div');
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '关闭';
  closeBtn.style.marginLeft = '8px';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '复制';
  const exportBtn = document.createElement('button');
  exportBtn.textContent = '导出';
  btns.appendChild(copyBtn);
  btns.appendChild(exportBtn);
  btns.appendChild(closeBtn);
  bar.appendChild(title);
  bar.appendChild(btns);
  const list = document.createElement('div');
  list.style.flex = '1';
  list.style.overflow = 'auto';
  list.style.fontFamily = 'monospace';
  list.style.fontSize = '12px';
  list.style.padding = '8px 12px';
  list.style.borderTop = '1px solid #eee';
  function render() {
    list.innerHTML = '';
    __logStore.slice(-200).forEach(rec => {
      const el = document.createElement('div');
      el.textContent = `[${rec.ts}] ${rec.level.toUpperCase()} ${rec.message}`;
      el.style.color = rec.level === 'error' ? '#b91c1c' : (rec.level === 'warn' ? '#b45309' : '#111827');
      list.appendChild(el);
      if (rec.stack) {
        const st = document.createElement('div');
        st.textContent = rec.stack;
        st.style.whiteSpace = 'pre-wrap';
        st.style.color = '#6b7280';
        list.appendChild(st);
      }
    });
  }
  copyBtn.onclick = async function() {
    try {
      const txt = __logStore.map(r => `[${r.ts}] ${r.level.toUpperCase()} ${r.message}${r.stack ? '\n'+r.stack : ''}`).join('\n');
      await navigator.clipboard.writeText(txt);
    } catch {}
  };
  exportBtn.onclick = function() {
    const txt = __logStore.map(r => JSON.stringify(r)).join('\n');
    const blob = new Blob([txt], { type: 'application/x-ndjson' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'client-logs.ndjson';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  closeBtn.onclick = function() { wrap.remove(); };
  panel.appendChild(bar);
  panel.appendChild(list);
  wrap.appendChild(panel);
  document.body.appendChild(wrap);
  render();
}

export { openClientLogOverlay };
