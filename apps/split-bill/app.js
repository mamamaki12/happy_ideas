import { h, add, render, $, store, yen, share } from '../../shared/lib.js';
import { splitBill } from './logic.js';

const db = store('split-bill');
const state = db.get('state', { total: '', round: 100, people: [{ name: '幹事', weight: 1 }, { name: 'Aさん', weight: 1 }, { name: 'Bさん', weight: 1 }] });
const app = $('#app');
const save = () => db.set('state', state);

const WEIGHTS = [[0.5, '少なめ'], [0.8, 'やや少'], [1, 'ふつう'], [1.2, 'やや多'], [1.5, '多め']];
const totalIn = h('input', { id: 'total', type: 'number', inputmode: 'numeric', min: 0, placeholder: '例: 23800', value: state.total });
const roundIn = h('select', { id: 'round' }, [1, 10, 100, 500, 1000].map((r) => h('option', { value: r, selected: r === state.round }, `${r}円単位`)));
const peopleBox = h('div');
const result = h('section', { class: 'card', 'aria-live': 'polite' });

totalIn.addEventListener('input', () => { state.total = totalIn.value; save(); calc(); });
roundIn.addEventListener('change', () => { state.round = +roundIn.value; save(); calc(); });

function drawPeople() {
  render(peopleBox, h('ul', { class: 'list' }, state.people.map((p, i) => h('li', {},
    h('input', { value: p.name, 'aria-label': `${i + 1}人目の名前`, oninput: (e) => { p.name = e.target.value; save(); calc(); } }),
    h('select', { 'aria-label': `${p.name}の傾斜`, style: { width: '110px' }, onchange: (e) => { p.weight = +e.target.value; save(); calc(); } },
      WEIGHTS.map(([w, l]) => h('option', { value: w, selected: w === p.weight }, l))),
    h('button', { class: 'small ghost', 'aria-label': `${p.name}を削除`, disabled: state.people.length <= 1, onclick: () => { state.people.splice(i, 1); save(); drawPeople(); calc(); } }, '×')))),
  h('button', { type: 'button', onclick: () => { state.people.push({ name: `${String.fromCharCode(65 + state.people.length - 1)}さん`, weight: 1 }); save(); drawPeople(); calc(); } }, '＋ 人を追加'));
}

function calc() {
  const r = splitBill(+state.total, state.people, state.round);
  const text = `【割り勘】合計 ${yen(+state.total || 0)}\n${r.shares.map((s) => `${s.name}: ${yen(s.amount)}`).join('\n')}${r.surplus > 0 ? `\n（端数 ${yen(r.surplus)} は幹事へ）` : ''}`;
  render(result, h('h2', {}, 'ひとりあたり'),
    h('ul', { class: 'list' }, r.shares.map((s) => h('li', {}, h('span', { class: 'grow' }, s.name), h('b', {}, yen(s.amount))))),
    r.surplus > 0 ? h('p', { class: 'muted small' }, `集金 ${yen(r.collected)}（端数 ${yen(r.surplus)} は幹事へ）`) : null,
    h('button', { class: 'primary big', disabled: !(+state.total > 0), onclick: () => share({ title: '割り勘', text }) }, '結果を共有'));
}

add(app, 
  h('section', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', { for: 'total' }, '合計金額（円）'), totalIn), h('div', {}, h('label', { for: 'round' }, '端数'), roundIn))),
  h('section', { class: 'card' }, h('h2', {}, 'メンバーと傾斜'), peopleBox),
  result);
drawPeople(); calc();
