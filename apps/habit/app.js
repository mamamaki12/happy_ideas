import { h, render, $, store, uid, todayStr, vibrate, confirmDelete } from '../../shared/lib.js';
import { weekStreak, thisWeekCount } from './logic.js';

// 習慣トラッカー。「毎日」ではなく「週に◯回」の目標にできるので、1日休んでも途切れない。
const db = store('habit');
let habits = db.get('habits', [{ id: uid(), name: '散歩する', icon: '🚶', perWeek: 4, dates: [] }, { id: uid(), name: '本を読む', icon: '📖', perWeek: 7, dates: [] }]);
const app = $('#app');
const listBox = h('div');
const save = () => db.set('habits', habits);
const ymd = (d) => todayStr(d);

function draw() {
  const today = new Date(); const t = todayStr();
  render(listBox, habits.map((hb) => {
    const doneToday = hb.dates.includes(t); const wk = thisWeekCount(hb.dates, today); const streak = weekStreak(hb.dates, hb.perWeek, today);
    const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(h('span', { class: `hd${hb.dates.includes(ymd(d)) ? ' on' : ''}`, title: ymd(d) }, '日月火水木金土'[d.getDay()])); }
    return h('section', { class: 'card habit' },
      h('div', { class: 'row', style: { alignItems: 'center' } },
        h('button', { class: `habit-check${doneToday ? ' on' : ''}`, 'aria-pressed': String(doneToday), 'aria-label': `${hb.name}を今日やった`, onclick: () => { hb.dates = doneToday ? hb.dates.filter((x) => x !== t) : [...hb.dates, t]; save(); if (!doneToday) vibrate([30, 30, 60]); draw(); } }, doneToday ? '✓' : hb.icon),
        h('div', { class: 'grow' }, h('b', {}, hb.name), h('div', { class: 'sub' }, `今週 ${wk}/${hb.perWeek} 回 ・ ${streak ? `🔥 ${streak}週連続` : 'これから'}`)),
        h('button', { class: 'small ghost shrink', 'aria-label': `${hb.name}を削除`, onclick: () => { if (confirmDelete(hb.name)) { habits = habits.filter((x) => x.id !== hb.id); save(); draw(); } } }, '×')),
      h('div', { class: 'meter', style: { margin: '8px 0' } }, h('div', { style: { width: `${Math.min(100, (wk / hb.perWeek) * 100)}%` } })),
      h('div', { class: 'hdays', 'aria-label': '直近7日' }, days));
  }));
}
const nIn = h('input', { id: 'hn', required: true, maxlength: 30, placeholder: '例: 筋トレ' });
const iIn = h('input', { id: 'hi', value: '⭐', maxlength: 4 });
const pIn = h('select', { id: 'hp' }, [1, 2, 3, 4, 5, 6, 7].map((n) => h('option', { value: n, selected: n === 3 }, n === 7 ? '毎日' : `週${n}回`)));
app.append(listBox, h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); habits.push({ id: uid(), name: nIn.value.trim(), icon: iIn.value || '⭐', perWeek: +pIn.value, dates: [] }); save(); nIn.value = ''; draw(); } },
  h('h2', {}, '習慣を追加'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'hn' }, '習慣'), nIn), h('div', { class: 'shrink', style: { width: '70px' } }, h('label', { for: 'hi' }, '絵文字'), iIn), h('div', {}, h('label', { for: 'hp' }, '目標'), pIn)),
  h('button', { class: 'primary', type: 'submit', style: { marginTop: '10px' } }, '追加')));
draw();
