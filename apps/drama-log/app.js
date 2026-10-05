import { h, add, render, $, store, uid, yen, todayStr, confirmDelete, toast } from '../../shared/lib.js';

// ショートドラマの視聴記録: 作品ごとに「何話まで観たか」と課金額を記録。課金しすぎを防ぐ。
const db = store('drama-log');
let shows = db.get('shows', []);
let budget = db.get('budget', 3000);
const app = $('#app');
const head = h('section', { class: 'card center' });
const listBox = h('div');
const save = () => db.set('shows', shows);
const month = () => todayStr().slice(0, 7);

function draw() {
  const spent = shows.flatMap((s) => s.pays).filter((p) => p.d.startsWith(month())).reduce((a, p) => a + p.yen, 0);
  const over = spent > budget;
  render(head, h('p', { class: 'muted small' }, '今月の課金'), h('p', { class: 'big-number', style: { color: over ? 'var(--danger)' : '' } }, yen(spent)),
    h('div', { class: 'meter' }, h('div', { style: { width: `${Math.min(100, (spent / Math.max(1, budget)) * 100)}%`, background: over ? 'var(--danger)' : '' } })),
    h('p', { class: 'small' }, over ? `⚠ 予算 ${yen(budget)} を ${yen(spent - budget)} 超えています` : `予算 ${yen(budget)} まであと ${yen(budget - spent)}`));
  render(listBox, shows.length === 0 ? h('p', { class: 'empty card' }, '観ている作品を追加しましょう') : shows.map((s) => {
    const total = s.pays.reduce((a, p) => a + p.yen, 0);
    const payIn = h('input', { type: 'number', min: 0, inputmode: 'numeric', placeholder: '円', 'aria-label': `${s.title}の課金額` });
    return h('section', { class: 'card' }, h('div', { class: 'row', style: { alignItems: 'center' } }, h('div', {}, h('b', {}, s.title), h('div', { class: 'sub' }, `${s.ep}話 / 全${s.total || '?'}話 ・ 累計 ${yen(total)}`)),
      h('button', { class: 'small ghost shrink', 'aria-label': `${s.title}を削除`, onclick: () => { if (confirmDelete(s.title)) { shows = shows.filter((x) => x.id !== s.id); save(); draw(); } } }, '×')),
      s.total ? h('div', { class: 'meter', style: { margin: '8px 0' } }, h('div', { style: { width: `${Math.min(100, (s.ep / s.total) * 100)}%` } })) : null,
      h('div', { class: 'btn-row' }, h('button', { class: 'small', 'aria-label': `${s.title}を1話戻す`, onclick: () => { s.ep = Math.max(0, s.ep - 1); save(); draw(); } }, '−1話'), h('button', { class: 'small primary', onclick: () => { s.ep += 1; save(); draw(); } }, '+1話 観た')),
      h('form', { class: 'row', style: { marginTop: '8px' }, onsubmit: (e) => { e.preventDefault(); const v = +payIn.value; if (v > 0) { s.pays.push({ d: todayStr(), yen: v }); save(); toast('課金を記録しました'); draw(); } } }, h('div', {}, payIn), h('button', { class: 'small shrink', type: 'submit' }, '課金を記録')));
  }));
}
const tIn = h('input', { id: 'dt', required: true, maxlength: 40, placeholder: '作品名' }); const nIn = h('input', { id: 'dn', type: 'number', min: 0, placeholder: '例: 80' });
add(app, head, listBox, h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); shows.unshift({ id: uid(), title: tIn.value.trim(), total: +nIn.value || 0, ep: 0, pays: [] }); save(); tIn.value = ''; nIn.value = ''; draw(); } },
  h('h2', {}, '作品を追加'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'dt' }, '作品名'), tIn), h('div', {}, h('label', { for: 'dn' }, '全何話'), nIn), h('button', { class: 'primary shrink', type: 'submit' }, '追加'))),
h('details', { class: 'card' }, h('summary', {}, '月の予算'), h('label', { for: 'bg' }, '予算（円）'), h('input', { id: 'bg', type: 'number', min: 0, value: budget, onchange: (e) => { budget = Math.max(0, +e.target.value || 0); db.set('budget', budget); draw(); } })));
draw();
