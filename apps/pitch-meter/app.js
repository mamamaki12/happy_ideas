import { h, add, $, startMic, stopStream, wakeLock } from '../../shared/lib.js';
import { detectPitch, noteOf } from './logic.js';

// 歌声の音程をリアルタイム表示。ずれ（セント）を針で示し、音程の軌跡を描く。
const app = $('#app');
const lock = wakeLock();
const note = h('p', { class: 'big-number pitch-note' }, '--');
const detail = h('p', { class: 'center muted', 'aria-live': 'off' }, 'マイクに向かって「あー」と声を出してください');
const needle = h('div', { class: 'needle' });
const gauge = h('div', { class: 'gauge', role: 'img', 'aria-label': '音程のずれ' }, h('span', {}, '♭'), h('span', {}, '♯'), needle);
const trail = h('canvas', { class: 'pitch-trail', width: 600, height: 200, role: 'img', 'aria-label': '音程の軌跡' });
const btn = h('button', { class: 'primary big', onclick: toggle }, '🎤 はじめる');
let stream = null; let ctx = null; let raf = 0; const hist = [];

function loop(an, buf) {
  an.getFloatTimeDomainData(buf);
  const f = detectPitch(buf, ctx.sampleRate);
  if (f) {
    const nn = noteOf(f);
    note.textContent = nn.name;
    detail.textContent = `${nn.en} ・ ${f.toFixed(1)} Hz ・ ${nn.cents > 0 ? '+' : ''}${nn.cents} セント`;
    needle.style.transform = `rotate(${Math.max(-50, Math.min(50, nn.cents)) * 0.9}deg)`;
    gauge.classList.toggle('in-tune', Math.abs(nn.cents) < 10);
    hist.push(nn.midi + nn.cents / 100);
  } else hist.push(null);
  if (hist.length > 300) hist.shift();
  const c = trail.getContext('2d'); c.clearRect(0, 0, 600, 200);
  const vals = hist.filter((v) => v != null); if (vals.length) {
    const mid = vals.at(-1); c.strokeStyle = 'rgba(128,128,128,.3)';
    for (let k = -6; k <= 6; k++) { const y = 100 - k * 14; c.beginPath(); c.moveTo(0, y); c.lineTo(600, y); c.stroke(); }
    c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    hist.forEach((v, i) => { if (v != null) c.fillRect(i * 2, 100 - (v - Math.round(mid)) * 14 - 2, 2, 4); });
  }
  raf = requestAnimationFrame(() => loop(an, buf));
}
async function toggle() {
  if (stream) { cancelAnimationFrame(raf); stopStream(stream); stream = null; await ctx.close(); lock.off(); btn.textContent = '🎤 はじめる'; return; }
  try { stream = await startMic(); } catch (e) { detail.textContent = e.message; return; }
  ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 4096;
  ctx.createMediaStreamSource(stream).connect(an);
  lock.on(); btn.textContent = '■ 停止';
  loop(an, new Float32Array(an.fftSize));
}
add(app, h('section', { class: 'card center' }, note, gauge, detail, trail, btn));
