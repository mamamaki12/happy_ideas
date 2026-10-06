import { h, add, render, $, store, wakeLock, startMic, stopStream, rmsOf, toast } from '../../shared/lib.js';

// 画面全体をペンライトにする。色・点滅・音に反応するモード。
const db = store('penlight');
const s = db.get('s', { color: '#ff5fa2', mode: 'solid' });
const app = $('#app');
const lock = wakeLock();
const PRESETS = ['#ff5fa2', '#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#00c7be', '#0a84ff', '#5e5ce6', '#bf5af2', '#ffffff'];
const stage = h('div', { class: 'pen-stage hidden', role: 'button', 'aria-label': 'ペンライト（タップで終了）', tabindex: 0 });
let raf = 0; let stream = null; let actx = null;

function animate(an, buf) {
  const t = performance.now() / 1000; let o = 1;
  if (s.mode === 'blink') o = Math.sin(t * Math.PI * 4) > 0 ? 1 : 0.15;
  else if (s.mode === 'wave') o = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 3));
  else if (s.mode === 'rainbow') stage.style.background = `hsl(${(t * 90) % 360} 100% 55%)`;
  else if (s.mode === 'sound' && an) { an.getFloatTimeDomainData(buf); o = Math.min(1, 0.15 + rmsOf(buf) * 8); }
  stage.style.opacity = String(o);
  raf = requestAnimationFrame(() => animate(an, buf));
}
async function light() {
  stage.style.background = s.color; stage.classList.remove('hidden');
  try { await document.documentElement.requestFullscreen?.(); } catch { /* 非対応 */ }
  lock.on();
  let an = null; let buf = null;
  if (s.mode === 'sound') {
    try { stream = await startMic(); actx = new AudioContext(); an = actx.createAnalyser(); an.fftSize = 1024; actx.createMediaStreamSource(stream).connect(an); buf = new Float32Array(1024); }
    catch (e) { toast(e.message); }
  }
  animate(an, buf);
}
function off() { cancelAnimationFrame(raf); stage.classList.add('hidden'); stage.style.opacity = '1'; lock.off(); stopStream(stream); stream = null; actx?.close(); actx = null; if (document.fullscreenElement) document.exitFullscreen?.(); }
stage.addEventListener('click', off);
stage.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter') off(); });

const swatches = h('div', { class: 'swatches' });
const drawSw = () => render(swatches, PRESETS.map((c) => h('button', { class: `sw${c === s.color ? ' on' : ''}`, style: { background: c }, 'aria-label': `色 ${c}`, 'aria-pressed': String(c === s.color), onclick: () => { s.color = c; db.set('s', s); drawSw(); } })),
  h('input', { type: 'color', value: s.color, 'aria-label': '好きな色', oninput: (e) => { s.color = e.target.value; db.set('s', s); } }));
const MODES = { solid: '点灯', blink: '点滅', wave: 'ゆらゆら', rainbow: 'レインボー', sound: '音に反応' };
add(app, h('section', { class: 'card' }, h('h2', {}, '色'), swatches),
  h('section', { class: 'card' }, h('label', { for: 'pm' }, 'モード'), h('select', { id: 'pm', onchange: (e) => { s.mode = e.target.value; db.set('s', s); } }, Object.entries(MODES).map(([k, l]) => h('option', { value: k, selected: k === s.mode }, l))),
    h('button', { class: 'primary big', style: { marginTop: '12px' }, onclick: light }, '✨ 光らせる'), h('p', { class: 'small muted' }, '画面をタップすると戻ります。画面の明るさを最大にしてください。会場のルールを守って使いましょう。')),
  stage);
drawSw();
