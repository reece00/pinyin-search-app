/// <reference lib="webworker" />
// 缓存版本标识
const CACHE_VERSION = 'v1.3.5';
const CACHE_NAME = `pinyin-search-app-${CACHE_VERSION}`;
// 在部分 IDE 中，`self` 会被当作 `Window` 类型。通过 `unknown` 中转再断言为 ServiceWorker 作用域。
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

// 安装事件 - 取消预加载，仅跳过等待
self.addEventListener('install', /** @param {ExtendableEvent} event */ (event) => {
  event.waitUntil(sw.skipWaiting());
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', /** @param {ExtendableEvent} event */ (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // 过滤掉不需要删除的缓存，避免Promise.all中包含undefined
          const cachesToDelete = cacheNames.filter((cacheName) => 
            cacheWhitelist.indexOf(cacheName) === -1
          );
          
          return Promise.all(
            cachesToDelete.map((cacheName) => {
              // 删除旧缓存
              console.log('删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            })
          );
      })
      .then(() => {
        // 立即接管所有客户端
        return sw.clients.claim();
      })
  );
});

// 资源请求事件 - 实现缓存优先策略
self.addEventListener('fetch', /** @param {FetchEvent} event */ (event) => {
  // 忽略非GET请求和chrome扩展请求
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果缓存中有匹配的响应，直接返回
        if (response) {
          return response;
        }

        // 缓存中没有，发起网络请求
        return fetch(event.request)
          .then((networkResponse) => {
            // 如果响应无效，直接返回
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // 克隆响应，一份存入缓存，一份返回给浏览器
            const responseToCache = networkResponse.clone();
            
            // 仅缓存GET请求和同源资源
            if (event.request.method === 'GET' && new URL(event.request.url).origin === self.location.origin) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch((error) => {
                  console.error('缓存请求失败:', error);
                });
            }

            return networkResponse;
          })
          .catch(() => {
            // 网络请求失败且是HTML请求，返回缓存的离线页面或首页
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('./index.html');
            }
            // 其他资源请求失败返回一个基本的响应，而不是undefined
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});



// 后台消息事件
self.addEventListener('message', /** @param {ExtendableMessageEvent} event */ (event) => {
  // 处理来自客户端的消息
  if (event.data && event.data.type === 'SKIP_WAITING') { // 版本切换消息约定
    sw.skipWaiting();
  }
  
  // 可以在这里添加更多消息类型的处理逻辑
});
