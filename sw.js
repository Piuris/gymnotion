/* GymNotion — cache offline */
const CACHE = 'gymnotion-v4';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/exercises.js',
  './js/exercise-images.js',
  './js/store.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

/* Cada recurso é guardado por conta própria: com addAll(), um único arquivo
   que falhe descarta o lote inteiro e o app fica sem nada em cache. */
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const falhas = [];
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        await cache.put(url, res);
      } catch (err) {
        falhas.push(url + ' (' + err.message + ')');
      }
    }));
    if (falhas.length) console.warn('[sw] não foi possível guardar:', falhas.join(', '));
    await self.skipWaiting();
  })());
});

/* As ~120 fotos dos exercícios (cerca de 660 KB) são guardadas depois que o app
   já está de pé, sem segurar a instalação. Assim a primeira abertura é rápida e
   as fotos ficam disponíveis offline pouco depois. */
self.addEventListener('message', (e) => {
  if (!e.data || e.data.tipo !== 'guardar-fotos' || !Array.isArray(e.data.fotos)) return;
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    let novas = 0;
    for (const url of e.data.fotos) {
      try {
        if (await cache.match(url)) continue;
        const res = await fetch(url);
        if (res.ok) { await cache.put(url, res); novas += 1; }
      } catch (err) { /* tenta de novo na próxima abertura */ }
    }
    if (novas) console.log('[sw] fotos guardadas para uso offline:', novas);
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* rede primeiro para o próprio app (pega atualizações), cache como reserva */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
