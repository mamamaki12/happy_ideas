import { h, render, $, store, todayStr, fmtTime, notify, notifyButton, vibrate } from '../../shared/lib.js';

// コップをタップして水分を記録。目標に対する進み具合と、最後に飲んでからの時間を出す。
const db = store('water-log');
let log = db.get('log', {}); // { date: [{t, ml}] }
let goal = db.get('goal', 1500);
const app = $('#app');
const glass = h('div', { class: 'glass', role: 'img' }, h('div', { class: 'water' }));
const big = h('p', { class: 'big-number' });
const since = h('p', { class: 'center muted', 'aria-live': 'polite' });
const listBox = h('ul', { class: 'list' });

function draw() {
  const today = log[todayStr()] || [];
  const total = today.reduce((s, x) => s + x.ml, 0);
  const pct = Math.min(100, (total / goal) * 100);
  glass.firstChild.style.height = `${pct}%`; glass.setAttribute('aria-label', `目標の${Math.round(pct)}%`);
  big.textContent = `${total} ml`;
  const last = today.at(-1)?.t;
  since.textContent = last ? `最後に飲んでから ${Math.round((Date.now() - last) / 60000)} 分 ・ 目標 ${goal} ml` : `目標 ${goal} ml`;
  render(listBox, today.slice().reverse().map((x, i) => h('li', {}, h('span', { class: 'grow' }, fmtTime(x.t)), h('b', {}, `${x.ml} ml`),
    h('button', { class: 'small ghost', 'aria-label': '取り消し', onclick: () => { today.splice(today.length - 1 - i, 1); db.set('log', log); draw(); } }, '×'))));
  const days = Object.keys(log).sort().slice(-7);
  render(weekBox, days.map((d) => { const t = log[d].reduce((s, x) => s + x.ml, 0); return h('div', { class: 'wk' }, h('div', { class: 'wk-bar', style: { height: `${Math.min(100, (t / goal) * 100)}%` }, title: `${t}ml` }), h('span', {}, d.slice(8))); }));
}
const weekBox = h('div', { class: 'week', role: 'img', 'aria-label': '直近7日の記録' });
function add(ml) { (log[todayStr()] ||= []).push({ t: Date.now(), ml }); db.set('log', log); vibrate(25); draw(); }
setInterval(() => {
  const last = (log[todayStr()] || []).at(-1)?.t; const hr = new Date().getHours();
  if (hr >= 8 && hr < 22 && (!last || Date.now() - last > 90 * 60000) && db.get('nag') !== Math.floor(Date.now() / 3600000)) { db.set('nag', Math.floor(Date.now() / 3600000)); notify('💧 お水を飲みましょう', '90分以上記録がありません'); }
  draw();
}, 60000);
const goalIn = h('input', { id: 'goal', type: 'number', min: 500, step: 100, value: goal, onchange: (e) => { goal = Math.max(500, +e.target.value || 1500); db.set('goal', goal); draw(); } });
app.append(h('section', { class: 'card center' }, glass, big, since, h('div', { class: 'grid-3' }, [150, 250, 500].map((ml) => h('button', { onclick: () => add(ml) }, `+${ml}ml`)))),
  h('section', { class: 'card' }, h('h2', {}, '今日の記録'), listBox), h('section', { class: 'card' }, h('h2', {}, '1週間'), weekBox),
  h('section', { class: 'card' }, h('label', { for: 'goal' }, '1日の目標（ml）'), goalIn, h('div', { style: { marginTop: '10px' } }, notifyButton())));
draw();
