import { h, render, $, store, uid, toast, confirmDelete } from '../../shared/lib.js';
import { schedule, parseCsv } from './logic.js';

// 間隔反復の暗記カード。忘れかけたころに出題する。CSV（表,裏）で一括登録できる。
const db = store('flashcards');
let cards = db.get('cards', [
  { id: uid(), front: 'serendipity', back: '思いがけない幸運な発見' },
  { id: uid(), front: '一期一会', back: 'one chance in a lifetime' },
  { id: uid(), front: 'H2O', back: '水' },
]);
const app = $('#app');
const save = () => db.set('cards', cards);
const study = h('section', { class: 'card center' });
let current = null; let flipped = false;

function dueCards() { const now = Date.now(); return cards.filter((c) => !c.due || c.due <= now); }
function next() {
  const due = dueCards(); flipped = false;
  current = due.sort((a, b) => (a.due || 0) - (b.due || 0))[0] || null;
  draw();
}
function draw() {
  const due = dueCards().length;
  if (!current) { render(study, h('p', { class: 'big-number' }, '🎉'), h('p', {}, '今日の復習は終わりです'), h('p', { class: 'small muted' }, `全${cards.length}枚・次の出題は時間がたつと出てきます`)); return; }
  render(study, h('p', { class: 'small muted' }, `残り ${due} 枚`),
    h('button', { class: `fc${flipped ? ' flipped' : ''}`, 'aria-label': flipped ? '裏面' : 'タップで裏返す', onclick: () => { flipped = true; draw(); } },
      h('span', { class: 'fc-front' }, current.front), flipped ? h('span', { class: 'fc-back' }, current.back) : h('span', { class: 'small muted' }, 'タップで答え')),
    flipped ? h('div', { class: 'grid-3' }, [[0, '😵 忘れた', 'danger'], [1, '🤔 あいまい', ''], [2, '😊 覚えた', 'primary']].map(([g, l, cls]) => h('button', { class: cls, onclick: () => grade(g) }, l))) : null);
}
function grade(g) { const i = cards.findIndex((c) => c.id === current.id); cards[i] = schedule(cards[i], g); save(); next(); }

const fIn = h('input', { id: 'ff', placeholder: '表（問題）', maxlength: 200 }); const bIn = h('input', { id: 'fb', placeholder: '裏（答え）', maxlength: 200 });
const csvIn = h('input', { type: 'file', accept: '.csv,.tsv,.txt,text/csv', 'aria-label': 'CSVファイルを読み込む', onchange: async (e) => {
  const f = e.target.files?.[0]; if (!f) return; if (f.size > 2_000_000) return toast('ファイルが大きすぎます（2MBまで）');
  const rows = parseCsv(await f.text()).slice(0, 5000); rows.forEach((r) => cards.push({ id: uid(), ...r })); save(); toast(`${rows.length}枚追加しました`); e.target.value = ''; next(); drawList();
} });
const listBox = h('details', { class: 'card' });
function drawList() {
  render(listBox, h('summary', {}, `カード一覧（${cards.length}枚）`), h('ul', { class: 'list' }, cards.slice(0, 200).map((c) => h('li', {}, h('span', { class: 'grow' }, `${c.front} — `, h('span', { class: 'muted' }, c.back)),
    h('span', { class: 'sub' }, c.interval ? `${c.interval}日` : '新規'),
    h('button', { class: 'small ghost', 'aria-label': `${c.front}を削除`, onclick: () => { if (confirmDelete(c.front)) { cards = cards.filter((x) => x.id !== c.id); save(); drawList(); if (current?.id === c.id) next(); } } }, '×')))));
}
app.append(study,
  h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); if (!fIn.value.trim() || !bIn.value.trim()) return; cards.push({ id: uid(), front: fIn.value.trim(), back: bIn.value.trim() }); save(); fIn.value = ''; bIn.value = ''; fIn.focus(); toast('追加しました'); if (!current) next(); drawList(); } },
    h('h2', {}, 'カードを追加'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'ff' }, '表'), fIn), h('div', {}, h('label', { for: 'fb' }, '裏'), bIn), h('button', { class: 'shrink primary', type: 'submit' }, '追加')),
    h('p', { class: 'small muted', style: { marginTop: '10px' } }, 'CSV（1列目=表, 2列目=裏）でまとめて追加:'), csvIn),
  listBox);
next(); drawList();
