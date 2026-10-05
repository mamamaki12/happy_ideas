import { h, add, render, $, store, vibrate } from '../../shared/lib.js';
import { analyzeTaps } from './logic.js';

// メトロノームに合わせてタップし、ずれ（ミリ秒）を測る。走りがち・もたりがちが分かる。
const db = store('rhythm-tap');
let best = db.get('best', null);
const app = $('#app');
const bpmIn = h('input', { id: 'bpm', type: 'range', min: 60, max: 180, value: 100 });
const bpmLabel = h('b', {}, '100');
const pad = h('button', { class: 'tap-pad', 'aria-label': 'タップ', disabled: true }, 'TAP');
const status = h('p', { class: 'center', 'aria-live': 'polite' }, 'スタートすると4拍のカウントのあと、16回タップします');
const result = h('section', { class: 'card hidden' });
const BEATS = 16;
let ctx = null; let start = 0; let interval = 0; let taps = []; let running = false;

bpmIn.addEventListener('input', () => { bpmLabel.textContent = bpmIn.value; });
function click(time, accent) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.frequency.value = accent ? 1500 : 1000; g.gain.setValueAtTime(0.4, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  o.connect(g).connect(ctx.destination); o.start(time); o.stop(time + 0.06);
}
async function go() {
  ctx ||= new AudioContext(); await ctx.resume();
  interval = 60000 / +bpmIn.value; taps = []; running = true;
  const t0 = ctx.currentTime + 0.3;
  for (let i = 0; i < BEATS + 4; i++) click(t0 + (i * interval) / 1000, i % 4 === 0);
  // AudioContext の時刻と performance.now() を対応づける
  start = performance.now() + 300 + 4 * interval;
  pad.disabled = false; status.textContent = '1, 2, 3, 4… 次の拍からタップ！'; result.classList.add('hidden');
  setTimeout(finish, 300 + (BEATS + 4) * interval + 300);
}
pad.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running) return; taps.push(performance.now()); vibrate(10); pad.classList.add('hit'); setTimeout(() => pad.classList.remove('hit'), 80); });
function finish() {
  running = false; pad.disabled = true;
  const valid = taps.filter((t) => t > start - interval / 2);
  const r = analyzeTaps(valid, start, interval);
  if (!valid.length) { status.textContent = 'タップがありませんでした'; return; }
  if (!best || r.absMean < best.absMean) { best = { absMean: r.absMean, bpm: +bpmIn.value }; db.set('best', best); }
  status.textContent = `判定 ${r.grade}`;
  const W = 300; const bar = h('div', { class: 'offsets', role: 'img', 'aria-label': 'タップのずれ' }, h('div', { class: 'center-line' }), r.offsets.map((o) => h('span', { class: 'dot-off', style: { left: `${W / 2 + Math.max(-W / 2, Math.min(W / 2, o / 2))}px` } })));
  render(result, h('p', { class: 'big-number' }, r.grade),
    h('div', { class: 'grid-3' }, h('div', { class: 'stat' }, h('b', {}, `${Math.round(r.absMean)}ms`), h('span', {}, '平均のずれ')), h('div', { class: 'stat' }, h('b', {}, `${r.mean > 0 ? '+' : ''}${Math.round(r.mean)}ms`), h('span', {}, r.mean > 15 ? 'もたり気味' : r.mean < -15 ? '走り気味' : 'ちょうど')), h('div', { class: 'stat' }, h('b', {}, `${Math.round(r.sd)}ms`), h('span', {}, 'ばらつき'))),
    bar, h('p', { class: 'small muted center' }, `← 早い ｜ 遅い →　自己ベスト ${Math.round(best.absMean)}ms（${best.bpm}BPM）`));
  result.classList.remove('hidden');
}
add(app, h('section', { class: 'card' }, h('label', { for: 'bpm' }, 'テンポ ', bpmLabel, ' BPM'), bpmIn, h('button', { class: 'primary big', style: { marginTop: '10px' }, onclick: go }, '▶ スタート')),
  h('section', { class: 'card center' }, pad, status), result);
