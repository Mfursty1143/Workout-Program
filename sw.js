/* Offline support for the Workout Planner.
   It asks the network first, so updates show up as usual. If you have no signal (or the network takes
   more than 3 seconds), it opens the copy it saved last time instead. */
const CACHE = 'workout-planner-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(networkFirst(e.request));
});

function networkFirst(req) {
  return new Promise(resolve => {
    let done = false;
    const finish = res => { if (!done) { done = true; resolve(res); } };
    const fromCache = () => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : null));
    const timer = setTimeout(() => { fromCache().then(hit => { if (hit) finish(hit); }); }, 3000);
    fetch(req).then(res => {
      clearTimeout(timer);
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      finish(res);
    }).catch(() => {
      clearTimeout(timer);
      fromCache().then(hit => finish(hit || Response.error()));
    });
  });
}
