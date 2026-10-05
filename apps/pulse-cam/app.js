import { h, render, $, store, startCamera, stopStream, wakeLock, fmtDateTime, vibrate } from '../../shared/lib.js';
import { estimateBpm } from './logic.js';

// 指先でカメラ（とライト）をふさぎ、血流による明るさのわずかな変化から心拍数を推定する。医療目的には使えない。
const db = store('pulse-cam');
let log = db.get('log', []);
const app = $('#app');
const lock = wakeLock();
const DURATION = 20; // 秒
const video = h('video', { playsinline: true, muted: true, autoplay: true, class: 'pulse-video', 'aria-label': 'カメラ映像' });
const graph = h('canvas', { class: 'pulse-graph', width: 600, height: 120, role: 'img', 'aria-label': '脈波グラフ' });
const status = h('p', { class: 'center', 'aria-live': 'polite' }, '開始を押して、背面カメラとライトを指先で軽くふさいでください。');
const big = h('p', { class: 'big-number' }, '--');
const startBtn = h('button', { class: 'primary big', onclick: () => run() }, '測定開始');
const logCard = h('section', { class: 'card' });
let stream = null; let running = false;

async function run() {
  if (running) return;
  running = true; startBtn.disabled = true; big.textContent = '--';
  try { stream = await startCamera(video, { facingMode: 'environment', width: 320, height: 240 }); }
  catch (e) { status.textContent = e.message; running = false; startBtn.disabled = false; return; }
  const track = stream.getVideoTracks()[0];
  let torch = false;
  try { if (track.getCapabilities?.().torch) { await track.applyConstraints({ advanced: [{ torch: true }] }); torch = true; } } catch { /* ライト非対応 */ }
  await lock.on();
  const c = h('canvas', { width: 40, height: 30 }); const ctx = c.getContext('2d', { willReadFrequently: true });
  const samples = []; const times = [];
  const t0 = performance.now();
  status.textContent = torch ? '測定中… 指を動かさないでください' : '測定中…（ライト非対応のため明るい場所で）';
  await new Promise((resolve) => {
    const tick = () => {
      const el = (performance.now() - t0) / 1000;
      if (el >= DURATION || !running) return resolve();
      ctx.drawImage(video, 0, 0, 40, 30);
      const d = ctx.getImageData(0, 0, 40, 30).data;
      let r = 0; let g = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; }
      const n = d.length / 4;
      samples.push(r / n); times.push(el);
      if (samples.length % 3 === 0) plot(samples);
      // 指でふさがれていれば赤が強く緑が弱い
      if (samples.length === 30 && !(r / n > 120 && g / n < r / n * 0.6)) status.textContent = '指でカメラ全体をふさいでください';
      big.textContent = `${Math.ceil(DURATION - el)}`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  stopStream(stream); stream = null; await lock.off();
  const fps = samples.length / (times.at(-1) || 1);
  const r = estimateBpm(samples, fps);
  running = false; startBtn.disabled = false;
  if (!r) { big.textContent = '--'; status.textContent = 'うまく測れませんでした。指で強く押さえすぎず、動かさずにもう一度。'; return; }
  vibrate(100);
  big.textContent = `${r.bpm}`;
  status.textContent = `推定 ${r.bpm} bpm（信頼度 ${(r.confidence * 100).toFixed(0)}%・${fps.toFixed(0)}fps）`;
  log.unshift({ t: Date.now(), bpm: r.bpm }); log = log.slice(0, 50); db.set('log', log); drawLog();
}

function plot(xs) {
  const ctx = graph.getContext('2d'); const w = graph.width; const hh = graph.height;
  const view = xs.slice(-150); const lo = Math.min(...view); const hi = Math.max(...view); const sp = hi - lo || 1;
  ctx.clearRect(0, 0, w, hh); ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2; ctx.beginPath();
  view.forEach((v, i) => { const x = (i / 149) * w; const y = hh - ((v - lo) / sp) * (hh - 10) - 5; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();
}

function drawLog() {
  render(logCard, h('h2', {}, '記録'), log.length === 0 ? h('p', { class: 'empty' }, 'まだ記録がありません') :
    h('ul', { class: 'list' }, log.slice(0, 10).map((x) => h('li', {}, h('span', { class: 'grow' }, fmtDateTime(x.t)), h('b', {}, `${x.bpm} bpm`)))));
}

app.append(h('section', { class: 'card' }, h('p', { class: 'notice' }, '⚠ 技術検証用です。医療機器ではありません。'), video, graph, big, status, startBtn), logCard);
drawLog();
addEventListener('pagehide', () => { running = false; stopStream(stream); });
