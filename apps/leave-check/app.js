import { h, render, $, store, uid, vibrate, fmtDateTime, toast } from '../../shared/lib.js';

// 出かける前の指差し確認。全部タップしたら「確認済み」の記録が残るので、外出先で不安になったら見返せる。
const db = store('leave-check');
let items = db.get('items', [['🔑', '鍵を持った'], ['🔥', 'ガスの元栓・コンロ'], ['🪟', '窓を閉めた'], ['💡', '電気を消した'], ['🔌', 'アイロン・ヘアアイロン'], ['📱', 'スマホ・財布']].map(([icon, label]) => ({ id: uid(), icon, label })));
let log = db.get('log', []);
const app = $('#app');
let checked = new Set();
const grid = h('div', { class: 'check-grid' });
const status = h('p', { class: 'center', 'aria-live': 'polite' });
const logCard = h('section', { class: 'card' });

function draw() {
  render(grid, items.map((it) => h('button', { class: `check-item${checked.has(it.id) ? ' on' : ''}`, 'aria-pressed': String(checked.has(it.id)), onclick: () => {
    checked.has(it.id) ? checked.delete(it.id) : checked.add(it.id); vibrate(30); draw();
    if (checked.size === items.length) { log.unshift(Date.now()); log = log.slice(0, 20); db.set('log', log); vibrate([50, 50, 150]); toast('✅ 確認完了！いってらっしゃい'); drawLog(); }
  } }, h('span', { class: 'ci-icon', 'aria-hidden': 'true' }, checked.has(it.id) ? '✅' : it.icon), h('span', {}, it.label))));
  status.textContent = `${checked.size} / ${items.length}`;
}
function drawLog() {
  render(logCard, h('h2', {}, '確認した記録'), log.length ? h('p', {}, h('b', {}, `最後の確認: ${fmtDateTime(log[0])}`)) : h('p', { class: 'empty' }, 'まだありません'),
    log.length > 1 ? h('ul', { class: 'list' }, log.slice(1, 6).map((t) => h('li', { class: 'sub' }, fmtDateTime(t)))) : null);
}
const newIn = h('input', { id: 'ni', placeholder: '例: エアコン', maxlength: 20 });
app.append(h('section', { class: 'card' }, status, grid, h('button', { class: 'ghost small', onclick: () => { checked = new Set(); draw(); } }, 'リセット')), logCard,
  h('details', { class: 'card' }, h('summary', {}, '項目を編集'),
    h('ul', { class: 'list' }, items.map((it) => h('li', {}, h('span', { class: 'grow' }, `${it.icon} ${it.label}`), h('button', { class: 'small ghost', 'aria-label': `${it.label}を削除`, onclick: () => { items = items.filter((x) => x.id !== it.id); db.set('items', items); location.reload(); } }, '×')))),
    h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (!newIn.value.trim()) return; items.push({ id: uid(), icon: '☑️', label: newIn.value.trim() }); db.set('items', items); location.reload(); } }, h('div', {}, h('label', { for: 'ni' }, '追加'), newIn), h('button', { class: 'shrink', type: 'submit' }, '追加'))));
draw(); drawLog();
