import { h, add, render, $ } from '../../shared/lib.js';
import { compare } from './logic.js';

const app = $('#app');
const UNITS = ['個', 'g', 'ml', '枚', 'ロール', '回分'];
let unit = '個';
const rows = [{ price: '', count: '1', amount: '' }, { price: '', count: '1', amount: '' }];
const box = h('div');
const unitSel = h('select', { id: 'unit', 'aria-label': '単位', onchange: (e) => { unit = e.target.value; draw(); } }, UNITS.map((u) => h('option', {}, u)));

function draw() {
  const r = compare(rows.map((x) => ({ price: +x.price, count: +x.count || 1, amount: +x.amount || 1 })));
  render(box, rows.map((row, i) => {
    const input = (key, label, ph) => h('div', {}, h('label', { for: `${key}${i}` }, label),
      h('input', { id: `${key}${i}`, type: 'number', inputmode: 'decimal', min: 0, step: 'any', placeholder: ph, value: row[key], oninput: (e) => { row[key] = e.target.value; update(); } }));
    const res = h('p', { class: 'result', 'data-i': i });
    return h('section', { class: `card${r.best === i ? ' best' : ''}` },
      h('h2', {}, `候補 ${String.fromCharCode(65 + i)}`),
      h('div', { class: 'row' }, input('price', '値段（円）', '398'), input('count', '入数', '1'), input('amount', `1つの量（${unit}）`, unit === '個' ? '1' : '500')),
      res);
  }), h('div', { class: 'btn-row' },
    h('button', { type: 'button', onclick: () => { rows.push({ price: '', count: '1', amount: '' }); draw(); } }, '＋ 候補を追加'),
    h('button', { type: 'button', class: 'ghost', disabled: rows.length <= 2, onclick: () => { rows.pop(); draw(); } }, '− 減らす')));
  update();
}

function update() {
  const r = compare(rows.map((x) => ({ price: +x.price, count: +x.count || 1, amount: +x.amount || 1 })));
  box.querySelectorAll('.result').forEach((p) => {
    const i = +p.dataset.i; const u = r.units[i];
    p.closest('.card').classList.toggle('best', r.best === i && r.units.filter((x) => x != null).length > 1);
    p.textContent = u == null ? '値段と量を入れてください' :
      `1${unit}あたり ${u < 10 ? u.toFixed(2) : u.toFixed(1)}円` + (r.best === i ? '　👑 いちばんお得' : `　（最安より +${r.diffs[i].toFixed(0)}%）`);
  });
}

add(app, h('section', { class: 'card' }, h('label', { for: 'unit' }, '比べる単位'), unitSel), box);
draw();
