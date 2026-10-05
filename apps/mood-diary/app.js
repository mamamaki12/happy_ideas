import { h, render, $, store, todayStr, fmtDate } from '../../shared/lib.js';

// 1日1タップで気分を記録。曜日ごとの平均や、最近の流れを見て自分の傾向を知る。
const db = store('mood-diary');
let days = db.get('days', {}); // { date: { m: 1-5, note } }
const app = $('#app');
const MOODS = [[1, '😞', 'つらい'], [2, '😕', 'いまいち'], [3, '😐', 'ふつう'], [4, '🙂', 'いい'], [5, '😄', 'さいこう']];
const top = h('section', { class: 'card center' });
const stats = h('section', { class: 'card' });
const save = () => db.set('days', days);

function draw() {
  const t = days[todayStr()];
  const noteIn = h('input', { id: 'note', placeholder: 'ひとこと（任意）', maxlength: 60, value: t?.note || '', onchange: (e) => { if (days[todayStr()]) { days[todayStr()].note = e.target.value; save(); } } });
  render(top, h('p', {}, t ? '今日の気分を記録しました（変更もできます）' : '今日の気分は？'),
    h('div', { class: 'moods' }, MOODS.map(([v, e, l]) => h('button', { class: `mood-btn${t?.m === v ? ' on' : ''}`, 'aria-pressed': String(t?.m === v), 'aria-label': l, onclick: () => { days[todayStr()] = { m: v, note: days[todayStr()]?.note || '' }; save(); draw(); } }, h('span', { 'aria-hidden': 'true' }, e), h('small', {}, l)))),
    t ? h('div', { class: 'field', style: { textAlign: 'left', marginTop: '10px' } }, h('label', { for: 'note' }, 'ひとこと'), noteIn) : null);
  const keys = Object.keys(days).sort();
  const byDow = Array.from({ length: 7 }, () => []);
  keys.forEach((k) => byDow[new Date(`${k}T00:00:00`).getDay()].push(days[k].m));
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const recent = []; for (let i = 27; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); recent.push([todayStr(d), days[todayStr(d)]]); }
  render(stats, h('h2', {}, '最近4週間'), h('div', { class: 'mood-cal' }, recent.map(([k, v]) => h('span', { class: 'mc', title: `${fmtDate(k)}${v?.note ? ` ${v.note}` : ''}`, 'aria-label': `${fmtDate(k)} ${v ? MOODS[v.m - 1][2] : '記録なし'}` }, v ? MOODS[v.m - 1][1] : '·'))),
    h('h2', { style: { marginTop: '14px' } }, '曜日ごとの平均'), h('div', { class: 'dow' }, '日月火水木金土'.split('').map((w, i) => { const a = avg(byDow[i]); return h('div', { class: 'dow-col' }, h('div', { class: 'dow-bar', style: { height: `${a ? (a / 5) * 100 : 0}%` } }), h('span', {}, w), h('small', {}, a ? a.toFixed(1) : '-')); })),
    keys.length >= 7 ? h('p', { class: 'small muted' }, (() => { const ranks = byDow.map((a, i) => [avg(a), i]).filter(([a]) => a != null).sort((x, y) => x[0] - y[0]); return ranks.length > 1 ? `${'日月火水木金土'[ranks[0][1]]}曜日は気分が下がりやすく、${'日月火水木金土'[ranks.at(-1)[1]]}曜日は上がりやすいようです。` : ''; })()) : h('p', { class: 'small muted' }, '1週間以上つけると傾向が見えてきます'));
}
app.append(top, stats);
draw();
