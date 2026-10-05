import { h, render, $, store, uid, daysUntil, notify, notifyButton, todayStr, confirmDelete } from '../../shared/lib.js';
import { requiredStock } from './logic.js';

// 家族構成から必要な備蓄量を計算し、今ある量と期限を管理する。
const db = store('bousai-stock');
const fam = db.get('fam', { adults: 2, kids: 0, pets: 0, days: 3 });
let have = db.get('have', {}); // key -> 数量
let expiries = db.get('exp', []); // {id, name, date}
const app = $('#app');
const needCard = h('section', { class: 'card' });
const expCard = h('section', { class: 'card' });

function draw() {
  const req = requiredStock(fam);
  const okCount = req.filter((r) => (have[r.key] || 0) >= r.need).length;
  render(needCard, h('h2', {}, `備蓄チェック（${okCount}/${req.length} 達成）`), h('div', { class: 'meter' }, h('div', { style: { width: `${(okCount / req.length) * 100}%` } })),
    h('ul', { class: 'list' }, req.map((r) => { const v = have[r.key] || 0; const ok = v >= r.need; return h('li', {},
      h('span', { 'aria-hidden': 'true' }, ok ? '✅' : '⬜'), h('div', { class: 'grow' }, h('div', {}, r.name), h('div', { class: 'sub' }, `必要 ${r.need}${r.unit}`)),
      h('input', { type: 'number', min: 0, value: v, class: 'qty', 'aria-label': `${r.name}の今ある量（${r.unit}）`, onchange: (e) => { have[r.key] = Math.max(0, +e.target.value || 0); db.set('have', have); draw(); } }), h('span', { class: 'sub' }, r.unit)); })));
  const sorted = [...expiries].sort((a, b) => a.date.localeCompare(b.date));
  render(expCard, h('h2', {}, '期限のあるもの'), sorted.length === 0 ? h('p', { class: 'empty' }, '水や非常食の期限を登録しましょう') :
    h('ul', { class: 'list' }, sorted.map((x) => { const d = daysUntil(x.date); return h('li', {}, h('span', { class: 'grow' }, x.name, h('span', { class: 'sub' }, ` ${x.date}`)),
      h('span', { class: `pill ${d < 0 ? 'danger' : d < 60 ? 'warn' : 'ok'}` }, d < 0 ? '期限切れ' : `あと${d}日`),
      h('button', { class: 'small ghost', 'aria-label': `${x.name}を削除`, onclick: () => { if (confirmDelete(x.name)) { expiries = expiries.filter((y) => y.id !== x.id); db.set('exp', expiries); draw(); } } }, '×')); })));
  const soon = sorted.filter((x) => daysUntil(x.date) < 30);
  if (soon.length && db.get('n') !== todayStr().slice(0, 7)) { db.set('n', todayStr().slice(0, 7)); notify('備蓄品の期限が近づいています', `${soon.map((x) => x.name).join('、')}。ローリングストックで食べて買い足しましょう`); }
}
const num = (k, label) => h('div', {}, h('label', { for: `f-${k}` }, label), h('input', { id: `f-${k}`, type: 'number', min: 0, max: 20, value: fam[k], onchange: (e) => { fam[k] = Math.max(0, +e.target.value || 0); db.set('fam', fam); draw(); } }));
const nIn = h('input', { id: 'en', placeholder: '例: 保存水 2L×6', maxlength: 30 }); const dIn = h('input', { id: 'ed', type: 'date' });
app.append(h('section', { class: 'card' }, h('h2', {}, '家族構成'), h('div', { class: 'row' }, num('adults', '大人'), num('kids', '子ども'), num('pets', 'ペット'),
  h('div', {}, h('label', { for: 'f-days' }, '何日分'), h('select', { id: 'f-days', onchange: (e) => { fam.days = +e.target.value; db.set('fam', fam); draw(); } }, [3, 7].map((d) => h('option', { value: d, selected: d === fam.days }, `${d}日分`)))))),
needCard, expCard,
h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); if (!nIn.value.trim() || !dIn.value) return; expiries.push({ id: uid(), name: nIn.value.trim(), date: dIn.value }); db.set('exp', expiries); nIn.value = ''; draw(); } },
  h('h2', {}, '期限を登録'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'en' }, '品名'), nIn), h('div', {}, h('label', { for: 'ed' }, '期限'), dIn), h('button', { class: 'shrink primary', type: 'submit' }, '追加')),
  h('div', { style: { marginTop: '10px' } }, notifyButton())));
draw();
