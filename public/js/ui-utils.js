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
  const enableOverlay = options.overlay !== false;
  const levels = Array.isArray(options.levels) && options.levels.length ? new Set(options.levels) : new Set(['error','warn']);
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

  function wrap(methodName, level, orig) {
    if (!orig || typeof orig !== 'function') return;
    console[methodName] = function(...args) {
      if (levels.has(level)) {
        const rec = __buildRecord(level, args);
        push(rec);
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
  });
  window.addEventListener('unhandledrejection', function(e) {
    const r = e && e.reason ? e.reason : 'unhandledrejection';
    const rec = __buildRecord('error', [r]);
    push(rec);
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

function openClientLogOverlay() {
  if (document.getElementById('client-log-overlay')) return;
  const style = document.createElement('style');
  style.textContent = `#client-log-list .log-item { white-space: pre-wrap; word-break: break-all; font-family: monospace; font-size: 12px; }`;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.id = 'client-log-overlay';
  
  const panel = document.createElement('div');
  panel.id = 'client-log-panel';
  
  const bar = document.createElement('div');
  bar.id = 'client-log-header';
  
  const title = document.createElement('div');
  title.textContent = '客户端日志';
  title.style.fontWeight = '600';
  
  const btns = document.createElement('div');
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '关闭';
  closeBtn.className = 'log-btn';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '复制';
  copyBtn.className = 'log-btn';
  const exportBtn = document.createElement('button');
  exportBtn.textContent = '导出';
  exportBtn.className = 'log-btn';
  
  btns.appendChild(copyBtn);
  btns.appendChild(exportBtn);
  btns.appendChild(closeBtn);
  bar.appendChild(title);
  bar.appendChild(btns);
  
  const list = document.createElement('div');
  list.id = 'client-log-list';
  
  function render() {
    list.innerHTML = '';
    __logStore.slice(-200).forEach(rec => {
      const el = document.createElement('div');
      el.className = `log-item ${rec.level === 'error' ? 'error' : (rec.level === 'warn' ? 'warn' : 'info')}`;
      el.textContent = `[${rec.ts}] ${rec.level.toUpperCase()} ${rec.message}`;
      list.appendChild(el);
      
      if (rec.stack) {
        const st = document.createElement('div');
        st.className = 'log-stack';
        st.textContent = rec.stack;
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

/**
 * 语义化日志追踪函数
 * 
 * 技术说明：
 * 1. 为什么不直接用 console.log.bind？
 *    因为 trace 需要处理动态逻辑（traceId 生成、持久化、内存存储等），bind 无法胜任。
 * 2. 调试建议：
 *    为了在控制台看到准确的“业务侧”调用点，请在控制台中右键本文件，选择 "Add script to ignore list"。
 */
function trace(module, action, data, options = {}) {
  const level = options.level || 'log';
  // 允许传入父 traceId 以维持链路
  const traceId = options.traceId || globalThis.__LAST_TRACE_ID__ || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const logger = typeof console[level] === 'function' ? console[level].bind(console) : console.log.bind(console);
  
  // 如果是重要动作，更新全局最后的 traceId
  if (options.persist !== false) {
    globalThis.__LAST_TRACE_ID__ = traceId;
  }

  logger(`[TRACE][${traceId}][${module}] ${action}`, data || '');
  return traceId;
}

/**
 * 监听元素外部点击
 * @param {HTMLElement} element 目标元素
 * @param {Function} callback 点击外部时的回调
 * @returns {Function} 用于移除监听器的卸载函数
 */
function onClickOutside(element, callback) {
  const handler = (event) => {
    if (element && !element.contains(event.target)) {
      callback(event);
    }
  };
  
  // 延迟绑定，避免触发本次点击
  setTimeout(() => {
    document.addEventListener('click', handler);
  }, 0);
  
  return () => document.removeEventListener('click', handler);
}

/**
 * 切换元素可见性
 * @param {HTMLElement} element 
 * @param {boolean} isVisible 
 */
function toggleVisibility(element, isVisible) {
  if (!element) return;
  if (isVisible) {
    element.classList.remove('hidden');
  } else {
    element.classList.add('hidden');
  }
}

/**
 * 在左上角显示微型提示（用于非阻塞的背景任务状态）
 * @param {string} message 
 * @param {number} duration 
 */
function showMiniToast(message, duration = 3000) {
  let el = document.getElementById('mini-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mini-toast';
    el.className = 'hidden opacity-0';
    document.body.appendChild(el);
  }

  el.textContent = message;
  el.classList.remove('hidden');
  
  // 强制重绘
  el.offsetHeight;
  
  el.classList.remove('opacity-0');
  el.classList.add('opacity-100');
  
  // 清除之前的定时器
  if (el._timer) clearTimeout(el._timer);
  
  el._timer = setTimeout(() => {
    el.classList.remove('opacity-100');
    el.classList.add('opacity-0');
    setTimeout(() => {
      el.classList.add('hidden');
    }, 300);
  }, duration);
}

function getLogs(limit = 1000) {
  return __logStore.slice(-limit);
}

export {
  showToast,
  showMiniToast,
  initErrorMonitor,
  openClientLogOverlay,
  trace,
  getLogs,
  onClickOutside,
  toggleVisibility
};
