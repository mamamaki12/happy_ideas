import { h, add, render, $, store } from '../../shared/lib.js';
import { packingList } from './logic.js';

// 条件を選ぶと持ち物リストができる。チェックしながら詰めて、残りがひと目で分かる。
const db = store('packing');
const s = db.get('s', { nights: 1, season: 'summer', purposes: [], abroad: false, checked: {} });
const app = $('#app');
const listCard = h('section', { class: 'card' });
const PURPOSES = { beach: '🏖 海', hike: '⛰ 山・アウトドア', live: '🎤 ライブ', business: '💼 出張', kids: '👶 子ども連れ' };
const save = () => db.set('s', s);

function draw() {
  const L = packingList(s); const all = L.flatMap(([, items]) => items); const done = all.filter((i) => s.checked[i]).length;
  render(listCard, h('h2', {}, `持ち物（${done}/${all.length}）`), h('div', { class: 'meter', style: { marginBottom: '10px' } }, h('div', { style: { width: `${(done / all.length) * 100}%` } })),
    L.map(([cat, items]) => h('div', {}, h('h3', { class: 'small muted' }, cat), h('ul', { class: 'list' }, items.map((it, j) => { const id = `pk-${cat}-${j}`; return h('li', {},
      h('input', { type: 'checkbox', id, checked: !!s.checked[it], onchange: (e) => { s.checked[it] = e.target.checked; save(); draw(); } }),
      h('label', { for: id, class: 'grow', style: { margin: 0, fontSize: '.95rem', color: s.checked[it] ? 'var(--muted)' : 'var(--text)', textDecoration: s.checked[it] ? 'line-through' : 'none' } }, it)); })))),
    done === all.length ? h('p', { class: 'notice' }, '🎉 準備完了！いってらっしゃい') : null,
    h('button', { class: 'small ghost', onclick: () => { s.checked = {}; save(); draw(); } }, 'チェックを外す'));
}
add(app, h('section', { class: 'card' },
  h('div', { class: 'row' },
    h('div', {}, h('label', { for: 'nt' }, '泊数'), h('select', { id: 'nt', onchange: (e) => { s.nights = +e.target.value; save(); draw(); } }, [0, 1, 2, 3, 4, 5, 6, 7, 10, 14].map((n) => h('option', { value: n, selected: n === s.nights }, n ? `${n}泊` : '日帰り')))),
    h('div', {}, h('label', { for: 'se' }, '季節'), h('select', { id: 'se', onchange: (e) => { s.season = e.target.value; save(); draw(); } }, [['summer', '夏'], ['mid', '春・秋'], ['winter', '冬']].map(([k, l]) => h('option', { value: k, selected: k === s.season }, l))))),
  h('div', { class: 'btn-row', style: { marginTop: '10px' } }, Object.entries(PURPOSES).map(([k, l]) => h('button', { class: 'small', 'aria-pressed': String(s.purposes.includes(k)), onclick: (e) => { s.purposes = s.purposes.includes(k) ? s.purposes.filter((x) => x !== k) : [...s.purposes, k]; e.currentTarget.setAttribute('aria-pressed', String(s.purposes.includes(k))); save(); draw(); } }, l)),
    h('button', { class: 'small', 'aria-pressed': String(s.abroad), onclick: (e) => { s.abroad = !s.abroad; e.currentTarget.setAttribute('aria-pressed', String(s.abroad)); save(); draw(); } }, '✈️ 海外'))), listCard);
draw();
