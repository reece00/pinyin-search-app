/**
 * PWA 助手模块：处理安装检测、Service Worker 注册和后台自动退出
 */

export function checkPWAStatus() {
  const isStandalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = typeof navigator !== 'undefined' && /** @type {any} */(navigator).standalone === true;
  return !!(isStandalone || isIOSStandalone);
}

export function registerServiceWorker() {
  const isSecure = typeof window !== 'undefined' && !!window.isSecureContext;
  if ('serviceWorker' in navigator && isSecure) {
    const registerSW = () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(registration => { console.log('Service Worker 注册成功:', registration.scope); })
        .catch(error => { console.log('Service Worker 注册失败:', error); });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker 已接管页面（PWA）');
      });

      navigator.serviceWorker.ready.then(() => {
        if (navigator.serviceWorker.controller) {
          console.log('Service Worker 已就绪（PWA）');
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }
}

let autoExitTimer = null;

export function initAutoExit(mins, exitCallback) {
  if (mins <= 0) return;
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      console.log(`应用进入后台，将在 ${mins} 分钟后退出`);
      autoExitTimer = setTimeout(() => {
        console.log('自动退出定时器触发');
        exitCallback();
      }, mins * 60 * 1000);
    } else {
      if (autoExitTimer) {
        console.log('应用回到前台，清除自动退出定时器');
        clearTimeout(autoExitTimer);
        autoExitTimer = null;
      }
    }
  });
}
