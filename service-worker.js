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

// 后台同步事件 - 处理离线时的数据同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-address-data') {
    event.waitUntil(
      // 这里可以实现数据同步逻辑
      // 例如从IndexedDB读取离线时存储的数据并发送到服务器
      Promise.resolve().then(() => {
        console.log('执行后台同步任务');
        // 同步完成后通知客户端
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SYNC_COMPLETED' });
          });
        });
      })
    );
  }
});

// 推送通知事件（简化版本，因为manifest.json中缺少相关权限声明）
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    // 简化的通知处理，避免使用可能需要额外权限的功能
    const data = event.data.json();
    const options = {
      body: data.body || '您有新的地址提醒',
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || '地址备忘录', options)
    );
  } catch (error) {
    console.error('处理推送通知失败:', error);
  }
});

// 通知点击事件（简化版本，移除对已不存在的actions的引用）
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // 简化处理，点击任何地方都打开目标URL
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 如果已经有打开的窗口，直接聚焦
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // 否则打开新窗口
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// 后台消息事件
self.addEventListener('message', (event) => {
  // 处理来自客户端的消息
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // 可以在这里添加更多消息类型的处理逻辑
});