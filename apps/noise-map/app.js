import { h, add, render, $, store, startMic, stopStream, rmsOf, wakeLock, geoErrorText, fmtTime, download, toast, mapUrl } from '../../shared/lib.js';

// 歩きながら音の大きさを測り、位置と一緒に記録する。静かなカフェや勉強場所を探すための「騒音マップ」。
const db = store('noise-map');
let points = db.get('points', []);
const app = $('#app');
const lock = wakeLock();
const OFFSET = 94;
const map = h('canvas', { class: 'nmap', width: 600, height: 400, role: 'img', 'aria-label': '騒音マップ' });
const big = h('p', { class: 'big-number' }, '-- dB');
const status = h('p', { class: 'center small muted', 'aria-live': 'polite' }, '開始すると、5秒ごとに音量と位置を記録します。');
const listBox = h('div');
let stream = null; let actx = null; let an = null; let watchId = null; let iv = 0; let here = null; let raf = 0; let samples = [];
const color = (db) => (db < 45 ? '#40c057' : db < 60 ? '#fab005' : db < 70 ? '#fd7e14' : '#e03131');

function drawMap() {
  const ctx = map.getContext('2d'); ctx.clearRect(0, 0, 600, 400);
  if (points.length === 0) { ctx.fillStyle = '#999'; ctx.font = '20px system-ui'; ctx.fillText('記録するとここに点が出ます', 170, 200); return; }
  const lats = points.map((p) => p.lat); const lons = points.map((p) => p.lon);
  const [a, b, c, d] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const k = Math.cos((a * Math.PI) / 180); const span = Math.max((d - c) * k, b - a) || 0.0005; const s = 340 / span;
  for (const p of points) { ctx.beginPath(); ctx.fillStyle = color(p.db); ctx.globalAlpha = 0.75; ctx.arc(130 + (p.lon - c) * k * s, 370 - (p.lat - a) * s, 10, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function drawList() {
  const quiet = [...points].sort((x, y) => x.db - y.db).slice(0, 5);
  render(listBox, h('h2', {}, `静かだった場所（${points.length}点中）`), quiet.length === 0 ? h('p', { class: 'empty' }, 'まだ記録がありません') : h('ul', { class: 'list' }, quiet.map((p) => h('li', {},
    h('span', { class: 'dot', style: { background: color(p.db) } }), h('span', { class: 'grow' }, `${Math.round(p.db)} dB ・ ${fmtTime(p.t)}`), h('a', { class: 'btn small', href: mapUrl(p.lat, p.lon), target: '_blank', rel: 'noopener noreferrer', 'aria-label': '地図で見る' }, '🗺')))),
  h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'small', disabled: !points.length, onclick: () => download(new Blob([JSON.stringify({ type: 'FeatureCollection', features: points.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { db: Math.round(p.db), time: new Date(p.t).toISOString() } })) })], { type: 'application/geo+json' }), 'noise-map.geojson') }, 'GeoJSONで書き出す'),
    h('button', { class: 'small ghost', disabled: !points.length, onclick: () => { if (confirm('記録をすべて消しますか？')) { points = []; db.set('points', points); drawMap(); drawList(); } } }, '全消去')));
}
function meter() { const buf = new Float32Array(an.fftSize); an.getFloatTimeDomainData(buf); const v = Math.max(0, 20 * Math.log10(rmsOf(buf) || 1e-8) + OFFSET); samples.push(v); big.textContent = `${Math.round(v)} dB`; raf = requestAnimationFrame(meter); }
async function toggle() {
  if (stream) { clearInterval(iv); cancelAnimationFrame(raf); navigator.geolocation.clearWatch(watchId); stopStream(stream); stream = null; await actx.close(); lock.off(); btn.textContent = '▶ 計測開始'; status.textContent = '停止しました'; return; }
  try { stream = await startMic(); } catch (e) { return toast(e.message); }
  actx = new AudioContext(); an = actx.createAnalyser(); an.fftSize = 2048; actx.createMediaStreamSource(stream).connect(an);
  watchId = navigator.geolocation.watchPosition((p) => { here = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }; }, (e) => { status.textContent = geoErrorText(e); }, { enableHighAccuracy: true });
  iv = setInterval(() => {
    if (!here || !samples.length) return;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length; samples = [];
    points.push({ lat: +here.lat.toFixed(6), lon: +here.lon.toFixed(6), db: avg, t: Date.now() }); points = points.slice(-2000); db.set('points', points);
    status.textContent = `${points.length}点目を記録（${Math.round(avg)} dB）`; drawMap(); drawList();
  }, 5000);
  lock.on(); btn.textContent = '■ 停止'; meter();
}
const btn = h('button', { class: 'primary big', onclick: toggle }, '▶ 計測開始');
add(app, h('section', { class: 'card center' }, map, h('p', { class: 'small' }, h('span', { class: 'dot', style: { background: '#40c057' } }), ' 静か ', h('span', { class: 'dot', style: { background: '#fab005' } }), ' 普通 ', h('span', { class: 'dot', style: { background: '#e03131' } }), ' うるさい'), big, status, btn),
  h('section', { class: 'card' }, listBox));
drawMap(); drawList();
