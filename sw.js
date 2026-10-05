// Service Worker: 一度開いたページをオフラインでも開けるようにする（ネットワーク優先・失敗時キャッシュ）。
// 通知の表示（registration.showNotification）にも使う。
const CACHE = 'happy-ideas-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // 同一オリジンの GET だけ扱う（外部APIはキャッシュしない）。/api/ は毎回最新が必要なので扱わない
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    } catch {
      const hit = await caches.match(req, { ignoreSearch: true });
      return hit || new Response('オフラインです', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});

// サーバーからの通知（推し活手帳）。中身は固定の文面だけで、予定の詳細は端末内のデータで表示する
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* 不正なデータ */ }
  const title = typeof d.title === 'string' ? d.title.slice(0, 80) : 'お知らせ';
  const body = typeof d.body === 'string' ? d.body.slice(0, 200) : '';
  // 開くURLは同じサイトの中だけ（外部へ飛ばされないように）
  let url = new URL('./', self.registration.scope).href;
  try { const u = new URL(typeof d.url === 'string' ? d.url : './', self.registration.scope); if (u.origin === self.location.origin) url = u.href; } catch { /* noop */ }
  e.waitUntil(self.registration.showNotification(title, { body, data: { url }, icon: new URL('shared/icon.svg', self.registration.scope).href }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (url) { const same = all.find((c) => c.url === url); if (same) return same.focus(); return self.clients.openWindow(url); }
    if (all[0]) return all[0].focus();
    return self.clients.openWindow('./');
  })());
});
