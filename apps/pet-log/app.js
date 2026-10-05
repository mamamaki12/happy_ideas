import { h, render, $, store, uid, todayStr, fmtDate, daysUntil, drawLineChart, notify, notifyButton, confirmDelete, toast } from '../../shared/lib.js';

// ペット健康手帳: 体重・ごはん・通院・ワクチンの記録。体重をグラフで見て、次のワクチン日を通知。
const db = store('pet-log');
let pets = db.get('pets', [{ id: uid(), name: 'ポチ', kind: '🐶' }]);
let cur = db.get('cur', pets[0].id);
let recs = db.get('recs', []);
const app = $('#app');
const main = h('div');
const save = () => { db.set('pets', pets); db.set('cur', cur); db.set('recs', recs); };
const TYPES = { weight: '⚖️ 体重', food: '🍚 ごはん', vet: '🏥 通院', vaccine: '💉 ワクチン', memo: '📝 メモ' };

function draw() {
  const pet = pets.find((p) => p.id === cur) || pets[0];
  const mine = recs.filter((r) => r.pet === pet.id).sort((a, b) => b.date.localeCompare(a.date));
  const weights = mine.filter((r) => r.type === 'weight').reverse();
  const nextVac = mine.filter((r) => r.type === 'vaccine' && r.next).map((r) => r.next).sort()[0];
  const chart = h('canvas', { class: 'chart', role: 'img', 'aria-label': '体重の推移' });
  const typeSel = h('select', { id: 'pt' }, Object.entries(TYPES).map(([k, l]) => h('option', { value: k }, l)));
  const valIn = h('input', { id: 'pv', placeholder: '体重(kg)・内容など', maxlength: 60 });
  const dateIn = h('input', { id: 'pd', type: 'date', value: todayStr() });
  const nextIn = h('input', { id: 'pn', type: 'date' });
  render(main,
    h('section', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', { for: 'ps' }, 'ペット'), h('select', { id: 'ps', onchange: (e) => { cur = e.target.value; save(); draw(); } }, pets.map((p) => h('option', { value: p.id, selected: p.id === pet.id }, `${p.kind} ${p.name}`)))),
      h('button', { class: 'shrink small', onclick: () => { const n = prompt('ペットの名前'); if (n?.trim()) { const p = { id: uid(), name: n.trim().slice(0, 20), kind: '🐾' }; pets.push(p); cur = p.id; save(); draw(); } } }, '＋ 追加'))),
    h('section', { class: 'card' }, h('h2', {}, `${pet.kind} ${pet.name} の体重`), chart, weights.length ? h('p', { class: 'small muted' }, `最新 ${weights.at(-1).value}kg（${fmtDate(weights.at(-1).date)}）`) : null,
      nextVac ? h('p', { class: `pill ${daysUntil(nextVac) < 14 ? 'warn' : ''}` }, `次のワクチン ${nextVac}（あと${daysUntil(nextVac)}日）`) : null),
    h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); const type = typeSel.value; const v = valIn.value.trim(); if (type === 'weight' && !(+v > 0)) return toast('体重を数字で入れてください'); recs.push({ id: uid(), pet: pet.id, type, value: type === 'weight' ? +v : v, date: dateIn.value || todayStr(), next: type === 'vaccine' ? nextIn.value : '' }); save(); toast('記録しました'); draw(); } },
      h('h2', {}, '記録する'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'pt' }, '種類'), typeSel), h('div', {}, h('label', { for: 'pd' }, '日付'), dateIn)),
      h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', {}, h('label', { for: 'pv' }, '内容'), valIn), h('div', {}, h('label', { for: 'pn' }, '次回（ワクチン）'), nextIn)),
      h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'primary', type: 'submit' }, '記録'), notifyButton())),
    h('section', { class: 'card' }, h('h2', {}, '記録一覧'), mine.length === 0 ? h('p', { class: 'empty' }, 'まだありません') : h('ul', { class: 'list' }, mine.slice(0, 50).map((r) => h('li', {}, h('span', { class: 'sub' }, fmtDate(r.date)), h('span', { class: 'grow' }, TYPES[r.type], ' ', r.type === 'weight' ? `${r.value}kg` : r.value, r.next ? `（次回 ${r.next}）` : ''),
      h('button', { class: 'small ghost', 'aria-label': '削除', onclick: () => { if (confirmDelete()) { recs = recs.filter((x) => x.id !== r.id); save(); draw(); } } }, '×'))))));
  requestAnimationFrame(() => drawLineChart(chart, weights.map((w) => w.value), { labels: weights.map((w) => fmtDate(w.date)) }));
  if (nextVac && daysUntil(nextVac) <= 7 && daysUntil(nextVac) >= 0 && db.get('n') !== todayStr()) { db.set('n', todayStr()); notify(`${pet.name}のワクチンが近づいています`, nextVac); }
}
app.append(main);
draw();
