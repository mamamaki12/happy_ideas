import { h, add, render, $, store, yen } from '../../shared/lib.js';
import { probAtLeastOne, pullsFor, expectedPulls } from './logic.js';

const db = store('gacha-calc');
const s = db.get('s', { rate: 0.7, price: 300, ceiling: 200, budget: 30000 });
const app = $('#app');
const out = h('section', { class: 'card', 'aria-live': 'polite' });

const field = (key, label, attrs) => {
  const inp = h('input', { id: key, type: 'number', inputmode: 'decimal', step: 'any', min: 0, value: s[key], ...attrs,
    oninput: (e) => { s[key] = +e.target.value; db.set('s', s); calc(); } });
  return h('div', {}, h('label', { for: key }, label), inp);
};

function calc() {
  const p = s.rate / 100;
  const ceil = s.ceiling > 0 ? s.ceiling : Infinity;
  const pulls = Math.floor(s.budget / (s.price || 1));
  const within = pulls >= ceil ? 1 : probAtLeastOne(p, pulls);
  const rows = [0.5, 0.8, 0.9, 0.99].map((t) => { const n = Math.min(pullsFor(p, t), ceil); return [t, n]; });
  const exp = expectedPulls(p, ceil);
  render(out,
    h('h2', {}, `予算 ${yen(s.budget)}（${pulls}回）で当たる確率`),
    h('p', { class: 'big-number' }, `${(within * 100).toFixed(1)}%`),
    h('div', { class: 'meter', role: 'img', 'aria-label': `確率 ${(within * 100).toFixed(0)}%` }, h('div', { style: { width: `${within * 100}%` } })),
    h('ul', { class: 'list', style: { marginTop: '12px' } },
      h('li', {}, h('span', { class: 'grow' }, '平均（期待値）'), h('b', {}, Number.isFinite(exp) ? `${Math.ceil(exp)}回 ／ ${yen(Math.ceil(exp) * s.price)}` : '—')),
      rows.map(([t, n]) => h('li', {}, h('span', { class: 'grow' }, `${t * 100}% の確率で当てるには`), h('b', {}, Number.isFinite(n) ? `${n}回 ／ ${yen(n * s.price)}` : '—')))),
    Number.isFinite(ceil) ? h('p', { class: 'muted small' }, `天井 ${ceil}回（${yen(ceil * s.price)}）で確定します。`) : null,
    within < 0.5 ? h('p', { class: 'notice' }, '当たる確率は半分以下です。予算を決めてから回しましょう。') : null);
}

add(app, h('section', { class: 'card' },
  h('div', { class: 'row' }, field('rate', '排出率（%）'), field('price', '1回の値段（円）'), field('ceiling', '天井（回、0=なし）'), field('budget', '予算（円）'))), out);
calc();
