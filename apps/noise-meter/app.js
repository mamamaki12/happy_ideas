import { h, render, $, startMic, stopStream, rmsOf, wakeLock } from '../../shared/lib.js';

// マイクで周囲の音量を測る。スマホのマイクは校正されていないので「目安のdB」。
const app = $('#app');
const lock = wakeLock();
const big = h('p', { class: 'big-number', 'aria-live': 'off' }, '-- dB');
const label = h('p', { class: 'center', 'aria-live': 'polite' }, '');
const meter = h('div', { class: 'meter noise-meter' }, h('div'));
const hist = h('canvas', { class: 'noise-hist', width: 600, height: 120, role: 'img', 'aria-label': '音量の推移' });
const stats = h('div', { class: 'grid-3' });
const btn = h('button', { class: 'primary big', onclick: toggle }, '🎤 計測開始');
const LEVELS = [[30, 'ささやき・深夜の郊外'], [40, '図書館・静かな住宅地'], [50, '静かな事務所'], [60, '普通の会話'], [70, '騒がしい事務所・掃除機'], [80, '地下鉄の車内'], [90, '大声・犬の鳴き声（近く）'], [200, '工事現場・危険な大きさ']];
let stream = null; let ctx = null; let raf = 0; const vals = []; let max = 0; let sum = 0; let n = 0;
let offset = +(localStorage.getItem('happy:noise-meter:offset') || 94);

function loop(an, buf) {
  an.getFloatTimeDomainData(buf);
  const rms = rmsOf(buf);
  const db = Math.max(0, 20 * Math.log10(rms || 1e-8) + offset);
  vals.push(db); if (vals.length > 300) vals.shift();
  max = Math.max(max, db); sum += db; n++;
  big.textContent = `${db.toFixed(0)} dB`;
  meter.firstChild.style.width = `${Math.min(100, (db / 100) * 100)}%`;
  label.textContent = `≒ ${LEVELS.find(([l]) => db < l)[1]}`;
  if (n % 10 === 0) {
    render(stats, h('div', { class: 'stat' }, h('b', {}, (sum / n).toFixed(0)), h('span', {}, '平均 dB')), h('div', { class: 'stat' }, h('b', {}, max.toFixed(0)), h('span', {}, '最大 dB')), h('div', { class: 'stat' }, h('b', {}, `${Math.round(n / 60)}s`), h('span', {}, '計測時間')));
    const c = hist.getContext('2d'); c.clearRect(0, 0, 600, 120); c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    vals.forEach((v, i) => { const hh = (v / 100) * 120; c.fillRect(i * 2, 120 - hh, 2, hh); });
  }
  raf = requestAnimationFrame(() => loop(an, buf));
}

async function toggle() {
  if (stream) { cancelAnimationFrame(raf); stopStream(stream); stream = null; await ctx.close(); lock.off(); btn.textContent = '🎤 計測開始'; return; }
  try { stream = await startMic(); } catch (e) { label.textContent = e.message; return; }
  ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(an);
  lock.on(); btn.textContent = '■ 停止';
  loop(an, new Float32Array(an.fftSize));
}
const offIn = h('input', { id: 'off', type: 'range', min: 70, max: 120, value: offset, oninput: (e) => { offset = +e.target.value; try { localStorage.setItem('happy:noise-meter:offset', offset); } catch { /* noop */ } } });
app.append(h('section', { class: 'card' }, big, meter, label, hist, stats, btn),
  h('details', { class: 'card' }, h('summary', {}, '校正（騒音計アプリや既知の音に合わせる）'), h('label', { for: 'off' }, '補正値'), offIn));
