import { h, add, render, $, store, requestMotion, vibrate, toast } from '../../shared/lib.js';

// 選択肢を入れてルーレットを回す。スマホを振っても回る。
const db = store('decider');
let options = db.get('options', ['ラーメン', 'カレー', 'うどん', '定食']);
const app = $('#app');
const COLORS = ['#ff8787', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac', '#63e6be'];
const canvas = h('canvas', { class: 'wheel', width: 600, height: 600, role: 'img', 'aria-label': 'ルーレット' });
const result = h('p', { class: 'big-number decider-result', 'aria-live': 'polite' }, '');
const listBox = h('div');
let angle = 0; let spinning = false;

function drawWheel() {
  const ctx = canvas.getContext('2d'); const r = 290; const c = 300; const n = options.length;
  ctx.clearRect(0, 0, 600, 600);
  options.forEach((o, i) => {
    const a0 = angle + (i * 2 * Math.PI) / n; const a1 = a0 + (2 * Math.PI) / n;
    ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, r, a0, a1); ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
    ctx.save(); ctx.translate(c, c); ctx.rotate((a0 + a1) / 2); ctx.fillStyle = '#222'; ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(o.length > 8 ? `${o.slice(0, 8)}…` : o, r - 20, 10); ctx.restore();
  });
  // 針（上）
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.moveTo(c - 18, 0); ctx.lineTo(c + 18, 0); ctx.lineTo(c, 40); ctx.fill();
}

/** 真上（-90°）の位置にあるセクション */
const pointed = () => { const n = options.length; const a = ((-Math.PI / 2 - angle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); return Math.floor(a / ((2 * Math.PI) / n)); };

function spin() {
  if (spinning || options.length < 2) return;
  spinning = true; result.textContent = '';
  const target = angle + 2 * Math.PI * (5 + Math.random() * 3) + Math.random() * 2 * Math.PI;
  const start = angle; const t0 = performance.now(); const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 3500;
  let lastIdx = pointed();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur); const e = 1 - (1 - p) ** 3;
    angle = start + (target - start) * e; drawWheel();
    const idx = pointed(); if (idx !== lastIdx) { vibrate(5); lastIdx = idx; }
    if (p < 1) requestAnimationFrame(step);
    else { spinning = false; result.textContent = `🎉 ${options[pointed()]}`; vibrate([60, 40, 60]); }
  };
  requestAnimationFrame(step);
}

let lastShake = 0;
function onMotion(e) {
  const g = e.accelerationIncludingGravity; if (!g) return;
  if (Math.hypot(g.x, g.y, g.z) > 25 && Date.now() - lastShake > 4000) { lastShake = Date.now(); spin(); }
}

function drawList() {
  const input = h('input', { id: 'opt', placeholder: '選択肢を追加', maxlength: 20, 'aria-label': '追加する選択肢' });
  render(listBox,
    h('ul', { class: 'list' }, options.map((o, i) => h('li', {}, h('span', { class: 'swatch-dot', style: { background: COLORS[i % COLORS.length] } }), h('span', { class: 'grow' }, o),
      h('button', { class: 'small ghost', 'aria-label': `${o}を削除`, disabled: options.length <= 2, onclick: () => { options.splice(i, 1); db.set('options', options); drawList(); drawWheel(); } }, '×')))),
    h('form', { class: 'row', style: { marginTop: '8px' }, onsubmit: (e) => { e.preventDefault(); const v = input.value.trim(); if (!v) return; if (options.length >= 12) return toast('12個までです'); options.push(v); db.set('options', options); drawList(); drawWheel(); } },
      h('div', {}, input), h('button', { class: 'shrink', type: 'submit' }, '追加')));
}

const shakeBtn = h('button', { class: 'small', onclick: async () => { if (await requestMotion()) { addEventListener('devicemotion', onMotion); shakeBtn.textContent = '📳 振ると回ります'; shakeBtn.disabled = true; } else toast('センサーが使えません'); } }, '📳 振って回す');
add(app, h('section', { class: 'card center' }, canvas, result, h('div', { class: 'btn-row' }, h('button', { class: 'primary big', onclick: spin }, 'まわす'), shakeBtn)), h('section', { class: 'card' }, h('h2', {}, '選択肢'), listBox));
drawWheel(); drawList();
