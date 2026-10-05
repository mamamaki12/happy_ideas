import { h, render, $, store, wakeLock, fmtDuration, share } from '../../shared/lib.js';

// 会議で誰が何分話したかを計る。話している人をタップするだけ。偏りが一目で分かる。
const db = store('meeting-timer');
let people = db.get('people', ['Aさん', 'Bさん', 'Cさん', 'Dさん']).map((n) => ({ name: n, ms: 0 }));
const app = $('#app');
const lock = wakeLock();
let active = -1; let since = 0; let start = 0; let iv = 0;
const grid = h('div', { class: 'speakers' });
const total = h('p', { class: 'center big-number', style: { fontSize: '2rem' } }, '00:00');
const COLORS = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#9775fa', '#ff922b', '#20c997', '#f06595'];

const elapsed = (i) => people[i].ms + (i === active ? Date.now() - since : 0);
function tap(i) {
  if (!start) { start = Date.now(); lock.on(); iv = setInterval(draw, 500); }
  if (active >= 0) people[active].ms += Date.now() - since;
  active = active === i ? -1 : i; since = Date.now(); draw();
}
function draw() {
  const sum = people.reduce((s, _, i) => s + elapsed(i), 0) || 1;
  total.textContent = start ? fmtDuration(Date.now() - start) : '00:00';
  render(grid, people.map((p, i) => h('button', { class: `spk${i === active ? ' on' : ''}`, style: { '--c': COLORS[i % COLORS.length] }, 'aria-pressed': String(i === active), onclick: () => tap(i) },
    h('b', {}, p.name), h('span', {}, fmtDuration(elapsed(i))), h('span', { class: 'small' }, `${Math.round((elapsed(i) / sum) * 100)}%`))),
  h('div', { class: 'share-bar', role: 'img', 'aria-label': '発言時間の割合' }, people.map((p, i) => h('div', { style: { width: `${(elapsed(i) / sum) * 100}%`, background: COLORS[i % COLORS.length] } }))));
}
function reset() { clearInterval(iv); people.forEach((p) => { p.ms = 0; }); active = -1; start = 0; lock.off(); draw(); }
const namesIn = h('input', { id: 'nm', value: people.map((p) => p.name).join('、'), 'aria-label': '参加者（読点区切り）' });
app.append(h('section', { class: 'card' }, total, grid, h('div', { class: 'btn-row', style: { marginTop: '12px' } },
  h('button', { onclick: () => { if (active >= 0) tap(active); } }, '⏸ 沈黙'), h('button', { onclick: () => share({ title: '発言時間', text: people.map((p, i) => `${p.name}: ${fmtDuration(elapsed(i))}`).join('\n') }) }, '共有'), h('button', { class: 'ghost', onclick: reset }, 'リセット'))),
h('section', { class: 'card' }, h('label', { for: 'nm' }, '参加者（「、」区切り・最大8人）'), namesIn, h('button', { class: 'small', style: { marginTop: '8px' }, onclick: () => { const ns = namesIn.value.split(/[、,]/).map((s) => s.trim()).filter(Boolean).slice(0, 8); if (!ns.length) return; db.set('people', ns); people = ns.map((n) => ({ name: n, ms: 0 })); reset(); } }, '反映')));
draw();
