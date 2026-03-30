/**
 * PWA 助手模块：处理安装检测、Service Worker 注册和后台自动退出
 */

import { showMiniToast } from './ui-utils.js';

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
        .then(registration => {
          console.log('Service Worker 注册成功:', registration.scope);

          // 监听更新事件
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              console.log('发现新版本 Service Worker，正在下载...');
              installingWorker.onstatechange = () => {
                console.log(`Service Worker 状态更新: ${installingWorker.state}`);
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('新版本下载完成，即将自动切换并刷新页面');
                  } else {
                    console.log('Service Worker 首次安装成功');
                  }
                }
              };
            }
          };
        })
        .catch(error => { console.log('Service Worker 注册失败:', error); });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker 已接管页面（PWA），页面将刷新以加载新内容');
        window.location.reload();
      });

      navigator.serviceWorker.ready.then((registration) => {
        if (navigator.serviceWorker.controller) {
          console.log('Service Worker 已就绪（PWA），正在检查更新...');
          registration.update().then(() => {
            console.log('Service Worker 更新检查完成');
          }).catch(err => {
            console.error('Service Worker 更新检查失败:', err);
            showMiniToast('服务器链接失败', 2000);
          });
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
let hiddenAtMs = null;

export function initAutoExit(mins, exitCallback) {
  if (mins <= 0) return;
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAtMs = Date.now();
      if (autoExitTimer) {
        clearTimeout(autoExitTimer);
      }
      console.log(`应用进入后台，将在 ${mins} 分钟后退出`);
      autoExitTimer = setTimeout(() => {
        console.log('自动退出定时器触发');
        hiddenAtMs = null;
        exitCallback();
      }, mins * 60 * 1000);
    } else {
      if (hiddenAtMs) {
        const elapsedMs = Date.now() - hiddenAtMs;
        if (elapsedMs >= mins * 60 * 1000) {
          if (autoExitTimer) {
            clearTimeout(autoExitTimer);
            autoExitTimer = null;
          }
          hiddenAtMs = null;
          console.log('应用回到前台，后台时长已超阈值，立即退出');
          exitCallback();
          return;
        }
      }
      if (autoExitTimer) {
        console.log('应用回到前台，清除自动退出定时器');
        clearTimeout(autoExitTimer);
        autoExitTimer = null;
      }
      hiddenAtMs = null;
    }
  });
}
