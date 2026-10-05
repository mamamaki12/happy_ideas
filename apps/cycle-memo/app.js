import { h, add, render, $, store, todayStr, daysUntil, fmtDate, confirmDelete } from '../../shared/lib.js';
import { predict } from './logic.js';

// 体調サイクルと日々の体調を端末内だけに記録する。データは一切外部に送らない。
const db = store('cycle-memo');
let starts = db.get('starts', []);
let notes = db.get('notes', {}); // date -> {mood, symptoms[]}
const app = $('#app');
const top = h('section', { class: 'card center', 'aria-live': 'polite' });
const SYM = ['頭痛', '腹痛', '眠い', 'むくみ', 'イライラ', '肌あれ', '元気'];
const save = () => { db.set('starts', starts); db.set('notes', notes); };

function draw() {
  const p = predict(starts);
  const d = p ? daysUntil(p.next) : null;
  const today = notes[todayStr()] || { symptoms: [] };
  render(top,
    p ? [h('p', { class: 'muted small' }, `平均 ${p.avg}日周期${p.samples ? `（直近${p.samples}回）` : '（初期値28日）'}`), h('p', { class: 'big-number' }, d > 0 ? `あと${d}日` : d === 0 ? '今日ごろ' : `${-d}日経過`), h('p', {}, `次の予定 ${fmtDate(p.next)}ごろ`)] : h('p', {}, '開始日を記録すると、次の予定を予測します'),
    h('button', { class: 'primary', onclick: () => { if (!starts.includes(todayStr())) { starts.push(todayStr()); save(); draw(); } } }, '今日はじまった'),
    h('h2', { style: { marginTop: '16px' } }, '今日の体調'),
    h('div', { class: 'btn-row' }, SYM.map((s) => h('button', { class: 'small', 'aria-pressed': String(today.symptoms.includes(s)), onclick: () => { const t = notes[todayStr()] ||= { symptoms: [] }; t.symptoms = t.symptoms.includes(s) ? t.symptoms.filter((x) => x !== s) : [...t.symptoms, s]; save(); draw(); } }, s))));
  render(hist, h('h2', {}, '開始日の記録'), starts.length === 0 ? h('p', { class: 'empty' }, 'まだありません') : h('ul', { class: 'list' }, [...starts].sort().reverse().map((s) => h('li', {}, h('span', { class: 'grow' }, s),
    h('button', { class: 'small ghost', 'aria-label': `${s}を削除`, onclick: () => { if (confirmDelete(s)) { starts = starts.filter((x) => x !== s); save(); draw(); } } }, '×')))),
  h('form', { class: 'row', style: { marginTop: '10px' }, onsubmit: (e) => { e.preventDefault(); const v = e.currentTarget.querySelector('input').value; if (v && !starts.includes(v)) { starts.push(v); save(); draw(); } } }, h('div', {}, h('input', { type: 'date', 'aria-label': '過去の開始日' })), h('button', { class: 'shrink', type: 'submit' }, '過去の日を追加')));
}
const hist = h('section', { class: 'card' });
add(app, h('p', { class: 'notice' }, '🔒 記録はこの端末の中だけに保存されます。医療目的の判断には使えません。'), top, hist);
draw();
