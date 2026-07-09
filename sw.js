/* ── Made Mark service worker ────────────────────────────────────────
   Strategy: pages (navigations) are network-first so deploys show up
   immediately, falling back to cache offline; assets are stale-while-
   revalidate (served from cache for speed, but refreshed in the background
   so the next load picks up any updated CSS/JS). Same-origin plus the two
   pinned CDN libraries are cached at runtime.
   Bump CACHE on each release so stale caches are dropped on activate. */

var CACHE = 'mademark-v2.13.3';

var CORE = [
  '/',
  '/style.css',
  '/label/',
  '/generate/',
  '/use-with-ai/',
  '/verify/',
  '/interop/',
  '/label/images/',
  '/label/vector/',
  '/label/video/',
  '/label/audio/',
  '/label/physical/',
  '/marks/',
  '/marks/human-made/',
  '/marks/human-designed-ai-made/',
  '/marks/ai-made/',
  '/assets/js/mm-xmp.js',
  '/assets/svg/mm-logo-dark.svg',
  '/assets/svg/mm-icon.svg',
  '/assets/svg/mm-icon-human-made.svg',
  '/assets/svg/mm-icon-human-designed-ai-made.svg',
  '/assets/svg/mm-icon-ai-made.svg',
  '/assets/favicon.svg',
  '/favicon.png',
  '/manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var cacheable = url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net';
  if (!cacheable) return;

  if (e.request.mode === 'navigate') {
    // Network-first for pages
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) { return hit || caches.match('/'); });
      })
    );
    return;
  }

  // Stale-while-revalidate for assets: serve the cached copy immediately when
  // present (fast, works offline), but always fetch a fresh copy in the
  // background and update the cache — so an updated CSS/JS file is picked up on
  // the next load without waiting for a CACHE bump. Falls back to cache on error.
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var fetchPromise = fetch(e.request).then(function (res) {
        if (res.ok || res.type === 'opaque') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || fetchPromise;
    })
  );
});
