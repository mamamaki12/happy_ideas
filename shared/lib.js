// 共通ユーティリティ。すべての試作アプリが ES Module として読み込む。
// 方針: innerHTML は使わず h() で DOM を組み立てる（XSS対策）。保存は端末内のみ。

/** DOM要素を作る。子要素の文字列は textContent として入るのでエスケープ不要。 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
/** 子要素を入れ替える */
export function render(el, ...children) { el.replaceChildren(); append(el, children); }

// ── 保存（localStorage。使えない環境でも落ちない） ──
export function store(ns) {
  const key = (k) => `happy:${ns}:${k}`;
  return {
    get(k, fallback) {
      try { const v = localStorage.getItem(key(k)); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(key(k), JSON.stringify(v)); return true; }
      catch { toast('保存できませんでした（ストレージが使えません）'); return false; }
    },
    remove(k) { try { localStorage.removeItem(key(k)); } catch { /* noop */ } },
  };
}

// ── IndexedDB の簡易キーバリュー（写真などの Blob 用） ──
export function blobStore(ns) {
  let dbp;
  const open = () => dbp ||= new Promise((res, rej) => {
    const req = indexedDB.open(`happy-${ns}`, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('kv', mode);
      const r = fn(t.objectStore('kv'));
      t.oncomplete = () => res(r?.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: (k) => tx('readonly', (s) => s.get(k)),
    set: (k, v) => tx('readwrite', (s) => s.put(v, k)),
    del: (k) => tx('readwrite', (s) => s.delete(k)),
  };
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// ── トースト ──
export function toast(msg, ms = 2600) {
  let wrap = $('.toast-wrap');
  if (!wrap) { wrap = h('div', { class: 'toast-wrap', role: 'status', 'aria-live': 'polite' }); document.body.append(wrap); }
  const t = h('div', { class: 'toast' }, msg);
  wrap.append(t);
  setTimeout(() => t.remove(), ms);
}

/** エラー表示（要素の先頭に出す） */
export function showError(container, msg) {
  const old = $('.error', container);
  if (old) old.remove();
  container.prepend(h('div', { class: 'error', role: 'alert' }, msg));
}

// ── 通知（Notification API。不可ならトーストで代替） ──
export function canNotify() { return 'Notification' in window; }
export async function ensureNotifyPermission() {
  if (!canNotify()) return 'unsupported';
  if (Notification.permission === 'default') {
    try { return await Notification.requestPermission(); } catch { return 'denied'; }
  }
  return Notification.permission;
}
export async function notify(title, body = '') {
  if (canNotify() && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.();
      if (reg) { await reg.showNotification(title, { body }); return true; }
      new Notification(title, { body });
      return true;
    } catch { /* フォールバックへ */ }
  }
  toast(`🔔 ${title}${body ? ` — ${body}` : ''}`, 5000);
  return false;
}
/** 通知許可ボタンを作る（ユーザー操作から要求する必要があるため） */
export function notifyButton() {
  const btn = h('button', { class: 'small', type: 'button' });
  const update = () => {
    const p = canNotify() ? Notification.permission : 'unsupported';
    btn.textContent = { granted: '🔔 通知オン', denied: '🔕 通知はブロック中', default: '🔔 通知を許可する', unsupported: '通知非対応（画面内で表示）' }[p];
    btn.disabled = p !== 'default';
  };
  btn.addEventListener('click', async () => { await ensureNotifyPermission(); update(); });
  update();
  return btn;
}

// ── 画面スリープ防止 ──
export function wakeLock() {
  let lock = null; let want = false;
  const acquire = async () => {
    if (!('wakeLock' in navigator) || !want) return;
    try { lock = await navigator.wakeLock.request('screen'); } catch { lock = null; }
  };
  const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
  return {
    get supported() { return 'wakeLock' in navigator; },
    async on() { want = true; document.addEventListener('visibilitychange', onVis); await acquire(); },
    async off() { want = false; document.removeEventListener('visibilitychange', onVis); try { await lock?.release(); } catch { /* noop */ } lock = null; },
  };
}

// ── 共有（Web Share。非対応ならクリップボード） ──
export async function share({ title, text, url, files }) {
  try {
    if (files && navigator.canShare?.({ files })) { await navigator.share({ title, text, files }); return 'shared'; }
    if (navigator.share) { await navigator.share({ title, text, url }); return 'shared'; }
  } catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  const body = [text, url].filter(Boolean).join('\n');
  try { await navigator.clipboard.writeText(body); toast('クリップボードにコピーしました'); return 'copied'; }
  catch { toast('共有できませんでした'); return 'failed'; }
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const vibrate = (p) => { try { navigator.vibrate?.(p); } catch { /* noop */ } };

// ── 位置情報 ──
export function getPosition(opts = {}) {
  return new Promise((res, rej) => {
    if (!('geolocation' in navigator)) return rej(new Error('この端末は位置情報に対応していません'));
    navigator.geolocation.getCurrentPosition(res, (e) => rej(new Error(geoErrorText(e))), { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000, ...opts });
  });
}
export function geoErrorText(e) {
  return { 1: '位置情報の利用が許可されていません', 2: '位置を取得できませんでした', 3: '位置情報の取得がタイムアウトしました' }[e?.code] || '位置情報エラー';
}
export { distance, bearing } from './geo.js';
export const fmtDistance = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`);
export const mapUrl = (lat, lon) => `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=17/${lat.toFixed(6)}/${lon.toFixed(6)}`;

// ── 端末の向き（iOS は許可が必要） ──
export async function requestOrientation() {
  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function') {
    try { return (await DOE.requestPermission()) === 'granted'; } catch { return false; }
  }
  return !!DOE;
}
export async function requestMotion() {
  const DME = window.DeviceMotionEvent;
  if (DME && typeof DME.requestPermission === 'function') {
    try { return (await DME.requestPermission()) === 'granted'; } catch { return false; }
  }
  return !!DME;
}
/** コンパス方位（北=0）。iOS は webkitCompassHeading、その他は absolute alpha から */
export function headingFromEvent(e) {
  if (typeof e.webkitCompassHeading === 'number') return e.webkitCompassHeading;
  if (e.absolute && typeof e.alpha === 'number') return (360 - e.alpha) % 360;
  return null;
}
export function watchHeading(cb) {
  const handler = (e) => { const v = headingFromEvent(e); if (v != null) cb(v); };
  const ev = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  window.addEventListener(ev, handler);
  return () => window.removeEventListener(ev, handler);
}

// ── カメラ ──
export async function startCamera(video, { facingMode = 'environment', width = 1280, height = 720 } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('この端末・ブラウザはカメラに対応していません（HTTPSが必要です）');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: width }, height: { ideal: height } }, audio: false });
  } catch (e) {
    throw new Error(e.name === 'NotAllowedError' ? 'カメラの利用が許可されていません' : `カメラを起動できませんでした（${e.name}）`);
  }
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play().catch(() => {});
  return stream;
}
export function stopStream(stream) { stream?.getTracks().forEach((t) => t.stop()); }
/** video の現在フレームを canvas に描いて Blob を返す */
export function captureFrame(video, { maxSide = 1280, type = 'image/jpeg', quality = 0.85 } = {}) {
  const w = video.videoWidth || 640; const hgt = video.videoHeight || 480;
  const s = Math.min(1, maxSide / Math.max(w, hgt));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(hgt * s);
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res({ blob: b, canvas: c }), type, quality));
}
/** 画像ファイルを縮小して Blob にする（容量節約） */
export async function resizeImage(file, maxSide = 1024, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
}

// ── マイク ──
export async function startMic() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('この端末・ブラウザはマイクに対応していません');
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch (e) {
    throw new Error(e.name === 'NotAllowedError' ? 'マイクの利用が許可されていません' : `マイクを起動できませんでした（${e.name}）`);
  }
}
/** 音量（dBFS → おおよその dB 表示用） */
export function rmsOf(buf) {
  let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

// ── 日付 ──
export const pad = (n) => String(n).padStart(2, '0');
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fmtDate = (s) => { const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const fmtDateTime = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtTime = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtDuration = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`; };
/** 今日から dateStr までの日数（今日=0） */
export function daysUntil(dateStr, now = new Date()) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}
export const yen = (n) => `${Math.round(n).toLocaleString('ja-JP')}円`;

/** URL が安全な http(s) か（javascript: 等を弾く） */
export function safeHttpUrl(s) {
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:' ? u : null; } catch { return null; }
}

/** 対応状況バッジ */
export function supportBadge(ok, label) {
  return h('span', { class: `pill ${ok ? 'ok' : 'warn'}` }, `${ok ? '✓' : '△'} ${label}`);
}

/** 確認付き削除 */
export function confirmDelete(what = 'この項目') { return window.confirm(`${what}を削除しますか？`); }

/** 簡易スパークライン/棒グラフ（canvas） */
export function drawLineChart(canvas, points, { color, min, max, labels } = {}) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 320; const hh = canvas.clientHeight || 160;
  canvas.width = w * dpr; canvas.height = hh * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, hh);
  const css = getComputedStyle(document.documentElement);
  const stroke = color || css.getPropertyValue('--accent').trim() || '#e8590c';
  const muted = css.getPropertyValue('--muted').trim() || '#888';
  if (points.length === 0) { ctx.fillStyle = muted; ctx.font = '13px system-ui'; ctx.fillText('データがありません', 10, hh / 2); return; }
  const lo = min ?? Math.min(...points); const hi = max ?? Math.max(...points);
  const span = hi - lo || 1; const padX = 28; const padY = 14;
  const x = (i) => padX + (points.length === 1 ? (w - padX * 2) / 2 : (i * (w - padX - 10)) / (points.length - 1));
  const y = (v) => hh - padY - ((v - lo) / span) * (hh - padY * 2);
  ctx.fillStyle = muted; ctx.font = '11px system-ui';
  ctx.fillText(String(+hi.toFixed(1)), 0, padY + 4); ctx.fillText(String(+lo.toFixed(1)), 0, hh - padY);
  ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.beginPath();
  points.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
  ctx.stroke();
  ctx.fillStyle = stroke;
  points.forEach((v, i) => { ctx.beginPath(); ctx.arc(x(i), y(v), 3, 0, Math.PI * 2); ctx.fill(); });
  if (labels) { ctx.fillStyle = muted; labels.forEach((l, i) => { if (l) ctx.fillText(l, x(i) - 10, hh - 1); }); }
}

// ── オフライン対応・通知用の Service Worker を登録（リポジトリ直下の sw.js） ──
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const swUrl = new URL('../sw.js', import.meta.url);
  navigator.serviceWorker.register(swUrl, { scope: new URL('../', import.meta.url).pathname }).catch(() => {});
}
