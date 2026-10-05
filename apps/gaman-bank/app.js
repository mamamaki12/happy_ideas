import { h, render, $, store, uid, toast, yen, vibrate, todayStr, fmtDate } from '../../shared/lib.js';

// 「買わなかった」金額を貯金箱に入れる。目標に向かってたまっていくのを見る。
const db = store('gaman-bank');
let log = db.get('log', []);
let goal = db.get('goal', { name: '旅行', amount: 30000 });
const presets = db.get('presets', [['☕ コーヒー', 450], ['🥤 コンビニ飲み物', 160], ['🍰 おやつ', 300], ['🚕 タクシー', 1500], ['🛒 衝動買い', 2000]]);
const app = $('#app');
const save = () => { db.set('log', log); db.set('goal', goal); };

const head = h('section', { class: 'card center', 'aria-live': 'polite' });
const listCard = h('section', { class: 'card' });

function add(label, amount) {
  log.unshift({ id: uid(), label, amount, date: todayStr() });
  save(); vibrate([30, 40, 30]);
  const total = log.reduce((s, x) => s + x.amount, 0);
  toast(total >= goal.amount ? `🎉 目標「${goal.name}」達成！` : `チャリン！ ${yen(amount)} 貯まりました`);
  draw();
}

function draw() {
  const total = log.reduce((s, x) => s + x.amount, 0);
  const month = log.filter((x) => x.date.slice(0, 7) === todayStr().slice(0, 7)).reduce((s, x) => s + x.amount, 0);
  const pct = Math.min(100, (total / (goal.amount || 1)) * 100);
  render(head,
    h('div', { class: 'pig', 'aria-hidden': 'true' }, '🐷'),
    h('p', { class: 'big-number' }, yen(total)),
    h('p', { class: 'muted' }, `目標「${goal.name}」${yen(goal.amount)} まで あと ${yen(Math.max(0, goal.amount - total))}`),
    h('div', { class: 'meter' }, h('div', { style: { width: `${pct}%` } })),
    h('p', { class: 'small muted' }, `今月 ${yen(month)}`));
  render(listCard, h('h2', {}, '履歴'),
    log.length === 0 ? h('p', { class: 'empty' }, 'がまんできたら上のボタンを押しましょう') :
      h('ul', { class: 'list' }, log.slice(0, 50).map((x) => h('li', {},
        h('span', { class: 'grow' }, x.label, h('span', { class: 'sub' }, ` ${fmtDate(x.date)}`)), h('b', {}, yen(x.amount)),
        h('button', { class: 'small ghost', 'aria-label': '取り消し', onclick: () => { log = log.filter((y) => y.id !== x.id); save(); draw(); } }, '×')))));
}

const customLabel = h('input', { id: 'cl', placeholder: '何をがまんした？' });
const customAmt = h('input', { id: 'ca', type: 'number', inputmode: 'numeric', min: 1, placeholder: '円' });
const goalName = h('input', { id: 'gn', value: goal.name });
const goalAmt = h('input', { id: 'ga', type: 'number', inputmode: 'numeric', min: 1, value: goal.amount });

app.append(head,
  h('section', { class: 'card' }, h('h2', {}, 'がまんした！'),
    h('div', { class: 'grid-2' }, presets.map(([l, a]) => h('button', { type: 'button', onclick: () => add(l, a) }, `${l} ${yen(a)}`))),
    h('form', { class: 'row', style: { marginTop: '12px' }, onsubmit: (e) => { e.preventDefault(); if (+customAmt.value > 0) { add(customLabel.value.trim() || 'その他', +customAmt.value); customAmt.value = ''; customLabel.value = ''; } } },
      h('div', {}, h('label', { for: 'cl' }, 'その他'), customLabel), h('div', {}, h('label', { for: 'ca' }, '金額'), customAmt), h('button', { class: 'primary shrink', type: 'submit' }, '入れる'))),
  listCard,
  h('details', { class: 'card' }, h('summary', {}, '目標を変える'),
    h('form', { class: 'row', style: { marginTop: '10px' }, onsubmit: (e) => { e.preventDefault(); goal = { name: goalName.value.trim() || '目標', amount: +goalAmt.value || 1 }; save(); draw(); toast('目標を更新しました'); } },
      h('div', {}, h('label', { for: 'gn' }, '目標'), goalName), h('div', {}, h('label', { for: 'ga' }, '金額'), goalAmt), h('button', { type: 'submit', class: 'shrink' }, '保存'))));
draw();
