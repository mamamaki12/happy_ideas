import { h, render, $, store, uid, todayStr, yen, fmtDate, confirmDelete, toast } from '../../shared/lib.js';
import { budgetStatus } from './logic.js';

// 旅行中の支出を、日割りの予算と比べる。使いすぎペースなら色で知らせる。
const db = store('trip-budget');
const s = db.get('s', { total: 50000, start: todayStr(), end: todayStr(), items: [] });
const app = $('#app');
const head = h('section', { class: 'card center', 'aria-live': 'polite' });
const listCard = h('section', { class: 'card' });
const CATS = ['🍜 食事', '🚃 交通', '🏨 宿', '🎡 観光', '🛍 おみやげ', '📦 その他'];
const save = () => db.set('s', s);

function draw() {
  const st = budgetStatus({ total: s.total, start: s.start, end: s.end, spent: s.items.map((x) => x.amount), today: todayStr() });
  const todaySpent = s.items.filter((x) => x.date === todayStr()).reduce((a, x) => a + x.amount, 0);
  const cls = st.pace > 1.15 ? 'danger' : st.pace > 1 ? 'warn' : 'ok';
  render(head, h('p', { class: 'muted small' }, `${st.elapsed}日目 / ${st.days}日`), h('p', { class: 'big-number' }, yen(st.left)), h('p', { class: 'muted' }, '残りの予算'),
    h('div', { class: 'meter' }, h('div', { style: { width: `${Math.min(100, (st.used / Math.max(1, s.total)) * 100)}%`, background: `var(--${cls === 'ok' ? 'ok' : cls})` } })),
    h('div', { class: 'grid-3', style: { marginTop: '10px' } },
      h('div', { class: 'stat' }, h('b', {}, yen(todaySpent)), h('span', {}, '今日使った')),
      h('div', { class: 'stat' }, h('b', {}, yen(Math.max(0, st.perDay))), h('span', {}, '残り1日あたり')),
      h('div', { class: 'stat' }, h('b', {}, h('span', { class: `pill ${cls}` }, cls === 'ok' ? '順調' : cls === 'warn' ? 'やや多め' : '使いすぎ')), h('span', {}, 'ペース'))));
  const byCat = CATS.map((c) => [c, s.items.filter((x) => x.cat === c).reduce((a, x) => a + x.amount, 0)]).filter(([, v]) => v);
  render(listCard, h('h2', {}, '支出'), byCat.length ? h('p', { class: 'small' }, byCat.map(([c, v]) => `${c} ${yen(v)}`).join(' ・ ')) : null,
    s.items.length === 0 ? h('p', { class: 'empty' }, 'まだ支出はありません') : h('ul', { class: 'list' }, s.items.slice().reverse().map((x) => h('li', {}, h('span', { class: 'sub' }, fmtDate(x.date)), h('span', { class: 'grow' }, x.cat, ' ', x.memo), h('b', {}, yen(x.amount)),
      h('button', { class: 'small ghost', 'aria-label': '削除', onclick: () => { if (confirmDelete()) { s.items = s.items.filter((y) => y.id !== x.id); save(); draw(); } } }, '×')))));
}
const amt = h('input', { id: 'ta', type: 'number', min: 0, inputmode: 'numeric', placeholder: '円', required: true });
const cat = h('select', { id: 'tc' }, CATS.map((c) => h('option', {}, c)));
const memo = h('input', { id: 'tm', maxlength: 30, placeholder: 'メモ' });
const cfg = (k, label, type) => h('div', {}, h('label', { for: `b-${k}` }, label), h('input', { id: `b-${k}`, type, value: s[k], onchange: (e) => { s[k] = type === 'number' ? Math.max(0, +e.target.value || 0) : e.target.value; save(); draw(); } }));
app.append(head,
  h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); s.items.push({ id: uid(), amount: +amt.value, cat: cat.value, memo: memo.value.trim(), date: todayStr() }); save(); amt.value = ''; memo.value = ''; toast('記録しました'); draw(); } },
    h('div', { class: 'row' }, h('div', {}, h('label', { for: 'ta' }, '金額'), amt), h('div', {}, h('label', { for: 'tc' }, '種類'), cat)), h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', {}, h('label', { for: 'tm' }, 'メモ'), memo), h('button', { class: 'primary shrink', type: 'submit' }, '記録'))),
  listCard, h('details', { class: 'card' }, h('summary', {}, '旅行の設定'), h('div', { class: 'row', style: { marginTop: '8px' } }, cfg('total', '予算（円）', 'number'), cfg('start', '出発日', 'date'), cfg('end', '最終日', 'date')),
    h('button', { class: 'small danger', style: { marginTop: '10px' }, onclick: () => { if (confirmDelete('すべての支出')) { s.items = []; save(); draw(); } } }, '支出をリセット')));
draw();
