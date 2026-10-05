import { h, render, $, store, uid, fmtTime, fmtDuration, todayStr, vibrate, confirmDelete } from '../../shared/lib.js';

// 片手で使える育児記録。大きなボタンで授乳・ミルク・おむつ・睡眠を記録。前回からの経過時間がすぐ分かる。
const db = store('baby-log');
let logs = db.get('logs', []);
const app = $('#app');
const KINDS = { breastL: ['🤱 授乳(左)', '#f783ac'], breastR: ['🤱 授乳(右)', '#f783ac'], milk: ['🍼 ミルク', '#74c0fc'], pee: ['💧 おしっこ', '#ffd43b'], poo: ['💩 うんち', '#c4a484'], sleep: ['😴 ねた', '#9775fa'], wake: ['☀️ おきた', '#ffa94d'] };
const grid = h('div', { class: 'baby-grid' });
const since = h('div', { class: 'grid-3', 'aria-live': 'polite' });
const listCard = h('section', { class: 'card' });
const milkPicker = h('div', { class: 'card hidden' }, h('p', { class: 'small' }, '🍼 ミルクの量は？'), h('div', { class: 'grid-3' }, [40, 60, 80, 100, 120, 140, 160, 180, 200].map((ml) => h('button', { onclick: () => { logs.unshift({ id: uid(), k: 'milk', t: Date.now(), ml }); save(); vibrate(40); milkPicker.classList.add('hidden'); draw(); } }, `${ml}ml`))));
const save = () => db.set('logs', logs);

function add(k) {
  const e = { id: uid(), k, t: Date.now() };
  if (k === 'milk') { milkPicker.classList.toggle('hidden'); return; }
  logs.unshift(e); logs = logs.slice(0, 2000); save(); vibrate(40); draw();
}
const last = (ks) => logs.find((x) => ks.includes(x.k));
function draw() {
  render(grid, Object.entries(KINDS).map(([k, [l, c]]) => h('button', { class: 'baby-btn', style: { '--c': c }, onclick: () => add(k) }, l)));
  const feed = last(['breastL', 'breastR', 'milk']); const diaper = last(['pee', 'poo']); const sl = last(['sleep', 'wake']);
  render(since,
    h('div', { class: 'stat' }, h('b', {}, feed ? fmtDuration(Date.now() - feed.t).slice(0, -3) : '—'), h('span', {}, `授乳から（${feed ? KINDS[feed.k][0].slice(3) : ''}）`)),
    h('div', { class: 'stat' }, h('b', {}, diaper ? fmtDuration(Date.now() - diaper.t).slice(0, -3) : '—'), h('span', {}, 'おむつから')),
    h('div', { class: 'stat' }, h('b', {}, sl ? fmtDuration(Date.now() - sl.t).slice(0, -3) : '—'), h('span', {}, sl?.k === 'sleep' ? 'ねてから' : 'おきてから')));
  const today = logs.filter((x) => todayStr(new Date(x.t)) === todayStr());
  const count = (ks) => today.filter((x) => ks.includes(x.k)).length;
  render(listCard, h('h2', {}, '今日'), h('p', { class: 'small' }, `授乳 ${count(['breastL', 'breastR'])}回 ・ ミルク ${count(['milk'])}回（${today.filter((x) => x.k === 'milk').reduce((s, x) => s + (x.ml || 0), 0)}ml）・ おしっこ ${count(['pee'])} ・ うんち ${count(['poo'])}`),
    h('ul', { class: 'list' }, today.map((x) => h('li', {}, h('b', {}, fmtTime(x.t)), h('span', { class: 'grow' }, KINDS[x.k][0], x.ml ? ` ${x.ml}ml` : ''),
      h('button', { class: 'small ghost', 'aria-label': '取り消し', onclick: () => { if (confirmDelete()) { logs = logs.filter((y) => y.id !== x.id); save(); draw(); } } }, '×')))));
}
setInterval(draw, 30000);
app.append(h('section', { class: 'card' }, since), h('section', { class: 'card' }, grid), milkPicker, listCard);
draw();
