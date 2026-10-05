import { h, render, $, store, wakeLock, fmtDuration, fmtDistance, fmtDateTime, geoErrorText, toast, download, confirmDelete } from '../../shared/lib.js';
import { trackDistance } from './logic.js';

// 歩いたルートを記録。データは端末内だけ。GPXで書き出せる。
const db = store('walk-tracker');
let walks = db.get('walks', []);
const app = $('#app');
const lock = wakeLock();
let pts = []; let watchId = null; let t0 = 0; let timer = null;

const big = h('p', { class: 'big-number' }, '0 m');
const sub = h('p', { class: 'center muted', 'aria-live': 'polite' }, 'スタートを押すと記録を始めます。画面は消さずに持ち歩いてください。');
const route = h('canvas', { class: 'route', width: 600, height: 360, role: 'img', 'aria-label': '歩いたルート' });
const btn = h('button', { class: 'primary big', onclick: toggle }, '▶ スタート');
const histCard = h('section', { class: 'card' });

function drawRoute(points) {
  const ctx = route.getContext('2d'); ctx.clearRect(0, 0, route.width, route.height);
  const good = points.filter((p) => p.acc <= 50);
  if (good.length < 2) return;
  const lats = good.map((p) => p.lat); const lons = good.map((p) => p.lon);
  const minLa = Math.min(...lats); const maxLa = Math.max(...lats); const minLo = Math.min(...lons); const maxLo = Math.max(...lons);
  const k = Math.cos((minLa * Math.PI) / 180);
  const span = Math.max((maxLo - minLo) * k, maxLa - minLa) || 1e-5;
  const s = (Math.min(route.width, route.height) - 40) / span;
  const X = (lo) => 20 + (lo - minLo) * k * s; const Y = (la) => route.height - 20 - (la - minLa) * s;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent'); ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
  good.forEach((p, i) => (i ? ctx.lineTo(X(p.lon), Y(p.lat)) : ctx.moveTo(X(p.lon), Y(p.lat)))); ctx.stroke();
  ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.arc(X(good[0].lon), Y(good[0].lat), 7, 0, 7); ctx.fill();
  ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.arc(X(good.at(-1).lon), Y(good.at(-1).lat), 7, 0, 7); ctx.fill();
}

function update() {
  const d = trackDistance(pts); const el = Date.now() - t0;
  big.textContent = fmtDistance(d);
  const pace = d > 50 ? (el / 60000) / (d / 1000) : null;
  sub.textContent = `${fmtDuration(el)}${pace ? ` ・ ${pace.toFixed(1)}分/km` : ''} ・ 約${Math.round(d / 0.7).toLocaleString()}歩 ・ GPS ${pts.length}点`;
  drawRoute(pts);
}

function toggle() {
  if (watchId == null) {
    if (!('geolocation' in navigator)) return toast('位置情報に対応していません');
    pts = []; t0 = Date.now();
    watchId = navigator.geolocation.watchPosition((p) => { pts.push({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, t: p.timestamp || Date.now() }); update(); },
      (e) => { sub.textContent = geoErrorText(e); }, { enableHighAccuracy: true, maximumAge: 0 });
    timer = setInterval(update, 1000); lock.on();
    btn.textContent = '■ ストップ'; btn.classList.remove('primary');
  } else {
    navigator.geolocation.clearWatch(watchId); watchId = null; clearInterval(timer); lock.off();
    btn.textContent = '▶ スタート'; btn.classList.add('primary');
    const d = trackDistance(pts);
    if (pts.length > 1) { walks.unshift({ t: t0, ms: Date.now() - t0, m: d, pts: pts.filter((p) => p.acc <= 50).map((p) => [+p.lat.toFixed(6), +p.lon.toFixed(6), p.t]) }); walks = walks.slice(0, 30); db.set('walks', walks); }
    toast(`おつかれさまでした！ ${fmtDistance(d)}`); drawHist();
  }
}

function gpx(w) {
  const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const seg = w.pts.map(([la, lo, t]) => `<trkpt lat="${esc(la)}" lon="${esc(lo)}"><time>${new Date(t).toISOString()}</time></trkpt>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="happy-ideas" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${esc(fmtDateTime(w.t))}</name><trkseg>${seg}</trkseg></trk></gpx>`;
}

function drawHist() {
  const week = walks.filter((w) => Date.now() - w.t < 7 * 86400000).reduce((s, w) => s + w.m, 0);
  render(histCard, h('h2', {}, `記録（直近7日 ${fmtDistance(week)}）`),
    walks.length === 0 ? h('p', { class: 'empty' }, 'まだ記録がありません') :
      h('ul', { class: 'list' }, walks.map((w, i) => h('li', {},
        h('button', { class: 'ghost grow', style: { justifyContent: 'flex-start' }, onclick: () => { drawRoute(w.pts.map(([lat, lon, t]) => ({ lat, lon, t, acc: 0 }))); big.textContent = fmtDistance(w.m); sub.textContent = `${fmtDateTime(w.t)} ・ ${fmtDuration(w.ms)}`; } }, `${fmtDateTime(w.t)}　${fmtDistance(w.m)}`),
        h('button', { class: 'small', 'aria-label': 'GPXで保存', onclick: () => download(new Blob([gpx(w)], { type: 'application/gpx+xml' }), `walk-${w.t}.gpx`) }, 'GPX'),
        h('button', { class: 'small ghost', 'aria-label': '削除', onclick: () => { if (confirmDelete()) { walks.splice(i, 1); db.set('walks', walks); drawHist(); } } }, '×')))));
}
app.append(h('section', { class: 'card center' }, route, big, sub, btn), histCard);
drawHist();
