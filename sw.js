// sw.js — Service Worker для оффлайн-кэширования «Хряк Симулятор» (PWA / Android APK)
const CACHE_NAME = 'hryak-simulator-v7-pbr';

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './pigGenerator.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

const STATIC_EXT_RE = /\.(?:glb|gltf|bin|jpg|jpeg|png|webp|woff2?|css)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        CORE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const isSameOrigin = url.origin === self.location.origin;
  const isCdnAsset =
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  // Тяжёлые 3D-модели (.glb/.gltf/.bin), PBR-текстуры (.jpg/.png) и CDN: Cache-First
  if ((isSameOrigin && STATIC_EXT_RE.test(url.pathname)) || isCdnAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req)
            .then((networkResp) => {
              if (networkResp && (networkResp.ok || networkResp.type === 'opaque')) {
                cache.put(req, networkResp.clone()).catch(() => {});
              }
              return networkResp;
            })
            .catch(() => cached);
        })
      )
    );
    return;
  }

  // Код приложения (HTML / JS) с того же домена: Network-First с оффлайн-фолбэком из кэша
  if (isSameOrigin) {
    event.respondWith(
      fetch(req)
        .then((networkResp) => {
          if (networkResp && networkResp.ok) {
            const copy = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy).catch(() => {}));
          }
          return networkResp;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('./index.html'))
        )
    );
  }
});
