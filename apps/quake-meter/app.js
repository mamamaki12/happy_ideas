import { h, add, $, store, requestMotion, wakeLock, fmtDateTime } from '../../shared/lib.js';
import { roughIntensity, intensityLabel } from './logic.js';

// 加速度センサーで揺れを測り、グラフと震度の目安を表示する。机の上に置いて使う。
const db = store('quake-meter');
const app = $('#app');
const lock = wakeLock();
const canvas = h('canvas', { class: 'seismo', width: 700, height: 200, role: 'img', 'aria-label': '揺れのグラフ' });
const now = h('p', { class: 'big-number' }, '--');
const peak = h('p', { class: 'center muted', 'aria-live': 'polite' }, '');
const startBtn = h('button', { class: 'primary big', onclick: start }, '計測をはじめる');
const buf = []; let maxGal = 0; let gravity = null;

function onMotion(e) {
  const a = e.acceleration?.x != null ? e.acceleration : null;
  let x; let y; let z;
  if (a) ({ x, y, z } = a);
  else { // 重力込みの値しかない端末はローパスで重力を推定して引く
    const g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
    gravity = gravity ? { x: gravity.x * 0.9 + g.x * 0.1, y: gravity.y * 0.9 + g.y * 0.1, z: gravity.z * 0.9 + g.z * 0.1 } : { ...g };
    x = g.x - gravity.x; y = g.y - gravity.y; z = g.z - gravity.z;
  }
  const gal = Math.hypot(x || 0, y || 0, z || 0) * 100;
  buf.push(gal); if (buf.length > 350) buf.shift();
  if (gal > maxGal) { maxGal = gal; const lab = intensityLabel(roughIntensity(gal)); peak.textContent = `最大 ${gal.toFixed(1)} gal（震度 ${lab} 相当）${fmtDateTime(Date.now())}`; if (roughIntensity(gal) >= 1) db.set('lastPeak', { gal, t: Date.now() }); }
}
function draw() {
  const ctx = canvas.getContext('2d'); const w = canvas.width; const hh = canvas.height;
  ctx.clearRect(0, 0, w, hh);
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent'); ctx.lineWidth = 2; ctx.beginPath();
  const scale = Math.max(20, ...buf);
  buf.forEach((v, i) => { const xx = (i / 349) * w; const yy = hh / 2 - (v / scale) * (hh / 2 - 6) * (i % 2 ? 1 : -1); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
  ctx.stroke();
  const cur = buf.at(-1) || 0;
  now.textContent = `${cur.toFixed(1)} gal`;
  requestAnimationFrame(draw);
}
async function start() {
  if (!(await requestMotion())) { peak.textContent = '加速度センサーが使えません'; return; }
  startBtn.classList.add('hidden'); lock.on();
  addEventListener('devicemotion', onMotion);
  requestAnimationFrame(draw);
}
const last = db.get('lastPeak');
add(app, h('section', { class: 'card center' }, canvas, now, peak, startBtn,
  h('p', { class: 'small muted' }, '※ スマホの加速度センサーによる簡易的な目安です。正式な震度は気象庁の発表を確認してください。'),
  last ? h('p', { class: 'small' }, `前回の記録: ${last.gal.toFixed(1)} gal（${fmtDateTime(last.t)}）`) : null));
