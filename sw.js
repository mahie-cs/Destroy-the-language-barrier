// Service worker: makes the app shell work offline.
// "__BUILD__" is replaced by the commit hash in CI (tools/build_site.sh), so every deploy
// gets a fresh cache and old ones are deleted. Audio is NOT handled here: js/audio.js caches it.
const CACHE = 'lingua-__BUILD__';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/config.js',
  'js/data.js',
  'js/state.js',
  'js/ui.js',
  'js/updates.js',
  'js/settings.js',
  'js/learn.js',
  'js/audio.js',
  'js/app.js',
  'data/countries.json',
  'data/languages.json',
  'data/phrases.json',
  'data/learn.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('lingua-') && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Stale-while-revalidate for same-origin files: answer from cache, refresh it in the background.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/audio/')) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
      e.waitUntil(net);
      return hit || net;
    }),
  );
});
