import { h, render, $, wakeLock, geoErrorText } from '../../shared/lib.js';
import { dirName } from '../../shared/compass.js';

// GPSの高度・速度・進行方向をそのまま表示する。端末によって高度が取れないことも確認できる。
const app = $('#app');
const lock = wakeLock();
const grid = h('div', { class: 'grid-2' });
const status = h('p', { class: 'center muted small', 'aria-live': 'polite' }, '開始を押すとGPSを読み取ります。');
let watchId = null; let maxSpeed = 0; let minAlt = Infinity; let maxAlt = -Infinity;
const stat = (label, value, unit) => h('div', { class: 'stat' }, h('b', {}, value), h('span', {}, `${label}${unit ? `（${unit}）` : ''}`));

function onPos(p) {
  const c = p.coords;
  const kmh = c.speed != null && c.speed >= 0 ? c.speed * 3.6 : null;
  if (kmh != null) maxSpeed = Math.max(maxSpeed, kmh);
  if (c.altitude != null) { minAlt = Math.min(minAlt, c.altitude); maxAlt = Math.max(maxAlt, c.altitude); }
  render(grid,
    stat('高度', c.altitude != null ? c.altitude.toFixed(0) : '—', 'm'),
    stat('高度の誤差', c.altitudeAccuracy != null ? `±${c.altitudeAccuracy.toFixed(0)}` : '—', 'm'),
    stat('速度', kmh != null ? kmh.toFixed(1) : '—', 'km/h'),
    stat('最高速度', maxSpeed.toFixed(1), 'km/h'),
    stat('進行方向', c.heading != null && !Number.isNaN(c.heading) ? `${dirName(c.heading)} ${c.heading.toFixed(0)}°` : '—'),
    stat('累積の高低差', Number.isFinite(maxAlt) ? (maxAlt - minAlt).toFixed(0) : '—', 'm'),
    stat('緯度', c.latitude.toFixed(5)), stat('経度', c.longitude.toFixed(5)));
  status.textContent = `水平の誤差 ±${Math.round(c.accuracy)}m ・ ${new Date(p.timestamp).toLocaleTimeString('ja-JP')}${c.altitude == null ? ' ・ この端末/ブラウザは高度を返しません' : ''}`;
}
const btn = h('button', { class: 'primary big', onclick: () => {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; lock.off(); btn.textContent = '▶ 開始'; return; }
  watchId = navigator.geolocation.watchPosition(onPos, (e) => { status.textContent = geoErrorText(e); }, { enableHighAccuracy: true, maximumAge: 0 });
  lock.on(); btn.textContent = '■ 停止';
} }, '▶ 開始');
app.append(h('section', { class: 'card' }, grid, status, btn));
render(grid, stat('高度', '—', 'm'), stat('速度', '—', 'km/h'));
