import { h, add, render, $, store, uid, todayStr, drawLineChart, fmtDate, confirmDelete, toast } from '../../shared/lib.js';

// 子どもの身長・体重を記録してグラフ化。「1年で何cm伸びたか」も出す。
const db = store('growth-chart');
let recs = db.get('recs', []);
const app = $('#app');
const main = h('div');
const save = () => db.set('recs', recs);
let metric = 'height';

function draw() {
  const sorted = [...recs].sort((a, b) => a.date.localeCompare(b.date));
  const pts = sorted.filter((r) => r[metric] > 0);
  const chart = h('canvas', { class: 'chart', role: 'img', 'aria-label': `${metric === 'height' ? '身長' : '体重'}の推移` });
  let growth = null;
  if (pts.length >= 2) {
    const last = pts.at(-1); const yearAgo = new Date(last.date); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const base = pts.filter((p) => new Date(p.date) <= yearAgo).at(-1) || pts[0];
    const days = (new Date(last.date) - new Date(base.date)) / 86400000;
    if (days > 0) growth = { diff: last[metric] - base[metric], days };
  }
  const hIn = h('input', { id: 'gh', type: 'number', step: 0.1, min: 0, inputmode: 'decimal', placeholder: 'cm' });
  const wIn = h('input', { id: 'gw', type: 'number', step: 0.1, min: 0, inputmode: 'decimal', placeholder: 'kg' });
  const dIn = h('input', { id: 'gd', type: 'date', value: todayStr() });
  render(main,
    h('div', { class: 'tabs', role: 'tablist' }, [['height', '📏 身長'], ['weight', '⚖️ 体重']].map(([k, l]) => h('button', { role: 'tab', 'aria-selected': String(k === metric), onclick: () => { metric = k; draw(); } }, l))),
    h('section', { class: 'card' }, chart, growth ? h('p', { class: 'center' }, `直近 ${Math.round(growth.days / 30)}か月で `, h('b', {}, `${growth.diff > 0 ? '+' : ''}${growth.diff.toFixed(1)}${metric === 'height' ? 'cm' : 'kg'}`)) : h('p', { class: 'muted center small' }, '2回以上記録するとのびが分かります')),
    h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); if (!(+hIn.value > 0) && !(+wIn.value > 0)) return toast('身長か体重を入れてください'); recs.push({ id: uid(), date: dIn.value || todayStr(), height: +hIn.value || 0, weight: +wIn.value || 0 }); save(); toast('記録しました'); draw(); } },
      h('h2', {}, '記録する'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'gd' }, '日付'), dIn), h('div', {}, h('label', { for: 'gh' }, '身長'), hIn), h('div', {}, h('label', { for: 'gw' }, '体重'), wIn), h('button', { class: 'primary shrink', type: 'submit' }, '記録'))),
    sorted.length === 0 ? null : h('section', { class: 'card' }, h('ul', { class: 'list' }, sorted.slice().reverse().map((r) => h('li', {}, h('span', { class: 'grow' }, r.date), h('span', {}, r.height ? `${r.height}cm` : ''), h('span', {}, r.weight ? `${r.weight}kg` : ''),
      h('button', { class: 'small ghost', 'aria-label': '削除', onclick: () => { if (confirmDelete()) { recs = recs.filter((x) => x.id !== r.id); save(); draw(); } } }, '×'))))));
  requestAnimationFrame(() => drawLineChart(chart, pts.map((p) => p[metric]), { labels: pts.map((p, i) => (i === 0 || i === pts.length - 1 ? fmtDate(p.date) : '')) }));
}
add(app, main);
draw();
