// 缓存版本标识，更新时修改此值以触发缓存更新
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `pinyin-search-app-${CACHE_VERSION}`;

// 需要缓存的资源列表
const STATIC_ASSETS = [
  '.',
  './index.html',
  './test.html',
  './manifest.json',
  './汉字拼音体.ttf'
  // 添加CDN资源的本地回退版本（如果有）
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('打开缓存');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // 跳过等待，直接激活
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('缓存静态资源失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
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
        return self.clients.claim();
      })
  );
});

// 资源请求事件 - 实现缓存优先策略
self.addEventListener('fetch', (event) => {
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
              return caches.match('.');
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

// 注意：已移除后台同步功能，因为当前项目不需要离线数据同步功能

// 注意：已移除推送通知相关功能，因为当前项目不需要推送功能

// 后台消息事件
self.addEventListener('message', (event) => {
  // 处理来自客户端的消息
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // 可以在这里添加更多消息类型的处理逻辑
});