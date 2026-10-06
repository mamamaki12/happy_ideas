import { h, add, render, $, store, uid, daysUntil, notify, notifyButton, todayStr, confirmDelete, toast } from '../../shared/lib.js';

// ポイントの残高と失効日をまとめて管理。失効が近いものから並べ、30日前・7日前に通知。
const db = store('point-expiry');
let pts = db.get('pts', []);
const app = $('#app');
const listCard = h('section', { class: 'card' });
const save = () => db.set('pts', pts);

function draw() {
  const sorted = [...pts].sort((a, b) => (a.exp || '9999').localeCompare(b.exp || '9999'));
  const total = pts.reduce((s, p) => s + p.amount * (p.rate || 1), 0);
  const risky = sorted.filter((p) => p.exp && daysUntil(p.exp) <= 30 && daysUntil(p.exp) >= 0);
  render(listCard, h('div', { class: 'grid-2' }, h('div', { class: 'stat' }, h('b', {}, `${Math.round(total).toLocaleString()}円分`), h('span', {}, '合計')), h('div', { class: 'stat' }, h('b', {}, `${Math.round(risky.reduce((s, p) => s + p.amount * (p.rate || 1), 0)).toLocaleString()}円分`), h('span', {}, '30日以内に失効'))),
    sorted.length === 0 ? h('p', { class: 'empty' }, 'ポイントを登録しましょう') : h('ul', { class: 'list' }, sorted.map((p) => { const d = p.exp ? daysUntil(p.exp) : null; return h('li', {},
      h('div', { class: 'grow' }, h('b', {}, p.name), h('div', { class: 'sub' }, `${p.amount.toLocaleString()} pt${p.rate && p.rate !== 1 ? `（${Math.round(p.amount * p.rate).toLocaleString()}円分）` : ''}`)),
      d == null ? h('span', { class: 'pill' }, '期限なし') : h('span', { class: `pill ${d < 0 ? '' : d <= 7 ? 'danger' : d <= 30 ? 'warn' : 'ok'}` }, d < 0 ? '失効' : `あと${d}日`),
      h('input', { type: 'number', min: 0, value: p.amount, class: 'pt-in', 'aria-label': `${p.name}の残高`, onchange: (e) => { p.amount = Math.max(0, +e.target.value || 0); save(); draw(); } }),
      h('button', { class: 'small ghost', 'aria-label': `${p.name}を削除`, onclick: () => { if (confirmDelete(p.name)) { pts = pts.filter((x) => x.id !== p.id); save(); draw(); } } }, '×')); })));
  for (const p of risky) { const d = daysUntil(p.exp); const key = `n:${p.id}:${d <= 7 ? 7 : 30}`; if (!db.get(key)) { db.set(key, todayStr()); notify(`${p.name} のポイントが${d}日後に失効します`, `${p.amount.toLocaleString()} pt を使いましょう`); } }
}
const nIn = h('input', { id: 'pn', required: true, maxlength: 20, placeholder: '例: ○○ポイント' }); const aIn = h('input', { id: 'pa', type: 'number', min: 0, inputmode: 'numeric', required: true });
const eIn = h('input', { id: 'pe', type: 'date' }); const rIn = h('input', { id: 'pr', type: 'number', step: 0.01, min: 0, value: 1 });
add(app, listCard, h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); pts.push({ id: uid(), name: nIn.value.trim(), amount: +aIn.value, exp: eIn.value, rate: +rIn.value || 1 }); save(); nIn.value = ''; aIn.value = ''; toast('登録しました'); draw(); } },
  h('h2', {}, 'ポイントを登録'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'pn' }, '名前'), nIn), h('div', {}, h('label', { for: 'pa' }, '残高'), aIn)),
  h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', {}, h('label', { for: 'pe' }, '失効日'), eIn), h('div', {}, h('label', { for: 'pr' }, '1pt = 何円'), rIn)),
  h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'primary', type: 'submit' }, '登録'), notifyButton())));
draw();
