import { h, render, $, store, uid, daysUntil, notify, notifyButton, todayStr, confirmDelete, share } from '../../shared/lib.js';

// ライブ・発売日・誕生日までのカウントダウン。前日と当日に通知する。
const db = store('oshi-countdown');
let events = db.get('events', []);
const app = $('#app');
const hero = h('section', { class: 'card center countdown-hero' });
const listCard = h('section', { class: 'card' });
const save = () => db.set('events', events);

function draw() {
  const upcoming = events.map((e) => ({ ...e, d: daysUntil(e.date) })).filter((e) => e.d >= 0).sort((a, b) => a.d - b.d);
  const next = upcoming[0];
  render(hero, next ? [h('p', { class: 'muted' }, next.title), h('p', { class: 'big-number', style: { color: next.color } }, next.d === 0 ? '今日！' : next.d),
    next.d ? h('p', {}, '日'): h('p', {}, '🎉🎉🎉'), h('button', { class: 'small', onclick: () => share({ title: next.title, text: next.d ? `${next.title} まであと${next.d}日！` : `今日は${next.title}！` }) }, '共有')] : h('p', { class: 'muted' }, '予定を追加しましょう'));
  render(listCard, h('h2', {}, '予定'), events.length === 0 ? h('p', { class: 'empty' }, 'なし') :
    h('ul', { class: 'list' }, events.map((e) => ({ ...e, d: daysUntil(e.date) })).sort((a, b) => a.date.localeCompare(b.date)).map((e) => h('li', {},
      h('span', { class: 'dot', style: { background: e.color } }), h('div', { class: 'grow' }, h('b', {}, e.title), h('div', { class: 'sub' }, e.date)),
      h('span', { class: 'pill' }, e.d < 0 ? '終了' : e.d === 0 ? '今日' : `あと${e.d}日`),
      h('button', { class: 'small ghost', 'aria-label': `${e.title}を削除`, onclick: () => { if (confirmDelete(e.title)) { events = events.filter((x) => x.id !== e.id); save(); draw(); } } }, '×')))));
  for (const e of upcoming) if (e.d <= 1 && db.get(`n:${e.id}`) !== todayStr()) { db.set(`n:${e.id}`, todayStr()); notify(e.d ? `明日は ${e.title}` : `今日は ${e.title}！`, e.d ? '準備はできていますか？' : '楽しんでね！'); }
}
const tIn = h('input', { id: 'ct', required: true, placeholder: '例: 東京ドーム公演', maxlength: 40 });
const dIn = h('input', { id: 'cd', type: 'date', required: true });
const cIn = h('input', { id: 'cc', type: 'color', value: '#ff5fa2' });
app.append(hero, h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); events.push({ id: uid(), title: tIn.value.trim(), date: dIn.value, color: cIn.value }); save(); tIn.value = ''; draw(); } },
  h('h2', {}, '予定を追加'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'ct' }, 'なに'), tIn), h('div', {}, h('label', { for: 'cd' }, 'いつ'), dIn), h('div', { class: 'shrink' }, h('label', { for: 'cc' }, '色'), cIn)),
  h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'primary', type: 'submit' }, '追加'), notifyButton())), listCard);
draw();
