/**
 * PWA 助手模块：处理安装检测、Service Worker 注册和后台自动退出
 */

import { showMiniToast, trace } from './ui-utils.js';

export function checkPWAStatus() {
  const isStandalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = typeof navigator !== 'undefined' && /** @type {any} */(navigator).standalone === true;
  return !!(isStandalone || isIOSStandalone);
}

export function registerServiceWorker() {
  const isSecure = typeof window !== 'undefined' && !!window.isSecureContext;
  if (!('serviceWorker' in navigator) || !isSecure) return;

  const isPWA = checkPWAStatus();
  const searchParams = new URLSearchParams(window.location.search);
  const swParam = searchParams.get('sw');
  const debugParam = searchParams.get('debug');

  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(location.hostname) ||
                  /^192\.168\./.test(location.hostname) ||
                  /^10\./.test(location.hostname) ||
                  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(location.hostname);

  // 优先级：sw=1 > sw=0 > debug=1/isLocal (默认禁) > isPWA (仅PWA) > 正常激活
  const isDebugMode = ['1', 'true', 'yes'].includes((debugParam || '').toLowerCase()) || isLocal;
  const isSWExplicitlyDisabled = swParam === '0';
  const isSWExplicitlyEnabled = swParam === '1';

  let shouldRegister = true;
  let reason = '正常激活模式';

  if (isSWExplicitlyDisabled) {
    shouldRegister = false;
    reason = 'URL 参数 sw=0 强制禁用';
  } else if (isSWExplicitlyEnabled) {
    shouldRegister = true;
    reason = 'URL 参数 sw=1 强制启用';
  } else if (isDebugMode) {
    shouldRegister = false;
    reason = '本地或调试模式默认不激活 SW';
  } else if (!isPWA) {
    shouldRegister = false;
    reason = '非 PWA 环境默认不激活 SW';
  }

  if (!shouldRegister) {
    // 只有当检测到已有注册时才打印清理日志，避免每次刷新都打印
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length > 0) {
        trace('SW', 'cleanup', { reason });
        registrations.forEach(reg => reg.unregister());
        if ('caches' in window) {
          window.caches.keys().then(keys => {
            keys.forEach(key => window.caches.delete(key));
          });
        }
      }
    });
    return;
  }

  trace('SW', 'status_check', { reason });

  const registerSW = () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        trace('SW', 'register_success', { scope: registration.scope });

        const updateStatus = (msg) => {
          const statusBar = document.getElementById('app-status-bar');
          if (statusBar) {
            const originalText = statusBar.getAttribute('data-original-text') || statusBar.textContent;
            if (!statusBar.getAttribute('data-original-text')) {
              statusBar.setAttribute('data-original-text', originalText);
            }
            statusBar.textContent = `${originalText} | ${msg}`;
          }
        };

        // 监听更新事件
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            trace('SW', 'update_found');
            updateStatus('发现更新...');

            installingWorker.onstatechange = () => {
              trace('SW', 'state_change', { state: installingWorker.state });
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  trace('SW', 'ready_for_skip_waiting');
                  updateStatus('更新就绪，正在切换...');
                  // 【关键点B】向正在安装的那个新 Worker 发送跳过等待指令
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                } else {
                  trace('SW', 'first_install_success');
                }
              }
            };
          }
        };
      })
      .catch(error => { trace('SW', 'register_fail', error, { level: 'error' }); });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      trace('SW', 'controller_change_reload');
      window.location.reload();
    });

    navigator.serviceWorker.ready.then((registration) => {
      // 检查是否有等待中的新版本
      if (registration.waiting) {
        trace('SW', 'waiting_found_skip');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      if (navigator.serviceWorker.controller) {
        trace('SW', 'active_check_update');
        registration.update().then(() => {
          trace('SW', 'update_check_done');
        }).catch(err => {
          trace('SW', 'update_check_fail', err, { level: 'warn' });
          showMiniToast('服务器链接失败', 2000);
        });
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

export function getSWStatus() {
  if (!('serviceWorker' in navigator)) return '不支持';

  const isPWA = checkPWAStatus();
  const searchParams = new URLSearchParams(window.location.search);
  const swParam = searchParams.get('sw');
  const debugParam = searchParams.get('debug');

  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(location.hostname) ||
                  /^192\.168\./.test(location.hostname) ||
                  /^10\./.test(location.hostname) ||
                  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(location.hostname);

  const isDebugMode = ['1', 'true', 'yes'].includes((debugParam || '').toLowerCase()) || isLocal;

  if (swParam === '0') return '已禁用 (sw=0)';
  if (swParam === '1') return '已激活 (sw=1)';
  if (isDebugMode) return '本地/调试模式默认禁用';
  if (!isPWA) return '非 PWA 环境不激活';
  return '正常激活模式';
}

let autoExitTimer = null;
let hiddenAtMs = null;

export function initAutoExit(mins, exitCallback) {
  if (mins <= 0) return;

  document.addEventListener('visibilitychange', () => {
    const now = Date.now();
    if (document.visibilityState === 'hidden') {
      hiddenAtMs = now;
      if (autoExitTimer) {
        clearTimeout(autoExitTimer);
        trace('闲置关闭页面', '重新计时', { mins });
      }
      const timeoutMs = mins * 60 * 1000;
      autoExitTimer = setTimeout(() => {
        trace('闲置关闭页面', '倒计时结束，准备重启');
        hiddenAtMs = null;
        exitCallback();
      }, timeoutMs);
      trace('闲置关闭页面', '进入后台，开始倒计时', { mins, timeoutMs, hiddenAt: new Date(now).toISOString() });
    } else {
      if (hiddenAtMs) {
        const elapsedMs = now - hiddenAtMs;
        const timeoutMs = mins * 60 * 1000;
        if (elapsedMs >= timeoutMs) {
          if (autoExitTimer) {
            clearTimeout(autoExitTimer);
            autoExitTimer = null;
          }
          hiddenAtMs = null;
          trace('闲置关闭页面', '超时，准备重启', { elapsedMs, timeoutMs, overflow: elapsedMs - timeoutMs });
          exitCallback();
          return;
        }
        const remainingSec = ((timeoutMs - elapsedMs) / 1000).toFixed(1);
        trace('闲置关闭页面', `回到前台，取消倒计时（还剩${remainingSec}秒）`, { hiddenAt: new Date(hiddenAtMs).toISOString(), visibleAt: new Date(now).toISOString(), elapsedMs, timeoutMs });
      }
      if (autoExitTimer) {
        clearTimeout(autoExitTimer);
        autoExitTimer = null;
      }
      hiddenAtMs = null;
    }
  });
}
