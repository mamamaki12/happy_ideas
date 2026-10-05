import { h, render, $, store, uid, toast, yen, notify, notifyButton, daysUntil, todayStr, confirmDelete } from '../../shared/lib.js';
import { nextRenewal } from './logic.js';

const db = store('sub-audit');
let subs = db.get('subs', []);
const app = $('#app');
const save = () => db.set('subs', subs);

const CYCLES = { month: ['毎月', 12], year: ['毎年', 1], week: ['毎週', 52] };
const yearly = (s) => s.price * CYCLES[s.cycle][1];

const nameIn = h('input', { id: 'n', placeholder: '例: 動画配信', required: true });
const priceIn = h('input', { id: 'p', type: 'number', min: 0, inputmode: 'numeric', required: true, placeholder: '円' });
const cycleIn = h('select', { id: 'c' }, Object.entries(CYCLES).map(([k, [l]]) => h('option', { value: k }, l)));
const startIn = h('input', { id: 's', type: 'date', value: todayStr() });

const form = h('form', { class: 'card', onsubmit: (e) => {
  e.preventDefault();
  subs.push({ id: uid(), name: nameIn.value.trim(), price: +priceIn.value, cycle: cycleIn.value, start: startIn.value || todayStr(), use: 3 });
  save(); nameIn.value = ''; priceIn.value = ''; toast('追加しました'); draw();
} },
  h('h2', {}, 'サブスクを追加'),
  h('div', { class: 'field' }, h('label', { for: 'n' }, 'サービス名'), nameIn),
  h('div', { class: 'row' },
    h('div', {}, h('label', { for: 'p' }, '金額'), priceIn),
    h('div', {}, h('label', { for: 'c' }, '支払い'), cycleIn),
    h('div', {}, h('label', { for: 's' }, '契約日'), startIn)),
  h('button', { class: 'primary', type: 'submit' }, '追加'));

const summary = h('section', { class: 'card' });
const listCard = h('section', { class: 'card' });
const USE = ['ほぼ使ってない', 'たまに', 'ふつう', 'よく使う'];

function draw() {
  const total = subs.reduce((s, x) => s + yearly(x), 0);
  const waste = subs.filter((s) => s.use <= 1).reduce((a, x) => a + yearly(x), 0);
  render(summary,
    h('div', { class: 'grid-3' },
      h('div', { class: 'stat' }, h('b', {}, yen(total / 12)), h('span', {}, '月あたり')),
      h('div', { class: 'stat' }, h('b', {}, yen(total)), h('span', {}, '年あたり')),
      h('div', { class: 'stat' }, h('b', {}, yen(waste)), h('span', {}, '見直し候補/年'))),
    waste > 0 ? h('p', { class: 'notice', style: { marginTop: '12px' } }, `「あまり使っていない」サブスクを解約すると、年 ${yen(waste)} 浮きます。`) : null,
    h('div', { style: { marginTop: '10px' } }, notifyButton()));
  const sorted = subs.map((s) => ({ ...s, next: nextRenewal(s.start, s.cycle) })).sort((a, b) => a.next.localeCompare(b.next));
  render(listCard, h('h2', {}, '次の更新が近い順'),
    sorted.length === 0 ? h('p', { class: 'empty' }, '契約中のサブスクを入れてみましょう') :
      h('ul', { class: 'list' }, sorted.map((s) => {
        const d = daysUntil(s.next);
        const useSel = h('select', { 'aria-label': `${s.name}の利用頻度`, style: { width: 'auto' }, onchange: (e) => { subs.find((x) => x.id === s.id).use = +e.target.value; save(); draw(); } },
          USE.map((l, i) => h('option', { value: i, selected: i === s.use }, l)));
        return h('li', { style: { flexWrap: 'wrap' } },
          h('div', { class: 'grow' }, h('b', {}, s.name), h('div', { class: 'sub' }, `${CYCLES[s.cycle][0]} ${yen(s.price)} ／ 年 ${yen(yearly(s))}`)),
          h('span', { class: `pill ${d <= 3 ? 'warn' : ''}` }, d === 0 ? '今日更新' : `${d}日後に更新`),
          useSel,
          h('button', { class: 'small ghost', 'aria-label': `${s.name}を削除`, onclick: () => { if (confirmDelete(s.name)) { subs = subs.filter((x) => x.id !== s.id); save(); draw(); } } }, '×'));
      })));
  // 3日以内の更新を1日1回通知
  const soon = sorted.filter((s) => daysUntil(s.next) <= 3);
  if (soon.length && db.get('notified') !== todayStr()) {
    db.set('notified', todayStr());
    notify('もうすぐ更新されるサブスク', soon.map((s) => `${s.name}（${s.next.slice(5)}）`).join('、'));
  }
}

app.append(summary, form, listCard);
draw();
