import { h, render, $, store, uid, share, confirmDelete, todayStr } from '../../shared/lib.js';
import { scoreSetlist } from './logic.js';

// セトリ予想 → ライブ後に答え合わせ。1行1曲で入力する。
const db = store('setlist');
let lives = db.get('lives', []);
const app = $('#app');
let cur = lives[0]?.id || null;
const main = h('div');
const save = () => db.set('lives', lives);

function draw() {
  const live = lives.find((l) => l.id === cur);
  const sel = h('select', { id: 'lv', onchange: (e) => { cur = e.target.value; draw(); } }, lives.map((l) => h('option', { value: l.id, selected: l.id === cur }, `${l.date} ${l.name}`)));
  const nameIn = h('input', { id: 'ln', placeholder: '例: 全国ツアー 東京公演', maxlength: 40 });
  const newForm = h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (!nameIn.value.trim()) return; const l = { id: uid(), name: nameIn.value.trim(), date: todayStr(), pred: '', actual: '' }; lives.unshift(l); cur = l.id; save(); draw(); } },
    h('div', {}, h('label', { for: 'ln' }, '新しいライブ'), nameIn), h('button', { class: 'shrink', type: 'submit' }, '作成'));
  if (!live) { render(main, h('section', { class: 'card' }, newForm)); return; }
  const ta = (key, label) => h('div', {}, h('label', { for: `t-${key}` }, label), h('textarea', { id: `t-${key}`, rows: 12, value: live[key], placeholder: '1行に1曲', oninput: (e) => { live[key] = e.target.value; save(); result(); } }));
  const resBox = h('div', { 'aria-live': 'polite' });
  const result = () => {
    const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
    const p = lines(live.pred); const a = lines(live.actual);
    if (!a.length) { render(resBox, h('p', { class: 'muted' }, 'ライブ後に「実際のセトリ」を入れると答え合わせできます')); return; }
    const r = scoreSetlist(p, a);
    render(resBox, h('p', { class: 'big-number' }, `${r.score}点`),
      h('p', { class: 'center' }, `的中 ${r.hits}/${a.length}曲（${Math.round(r.rate * 100)}%）・順番まで一致 ${r.exact}曲`, r.opener ? ' ・ 🎯1曲目的中' : '', r.closer ? ' ・ 🎯ラスト的中' : ''),
      h('button', { class: 'small', onclick: () => share({ title: 'セトリ予想', text: `${live.name} のセトリ予想、${a.length}曲中${r.hits}曲的中！（${r.score}点）` }) }, '結果を共有'));
  };
  render(main, h('section', { class: 'card' }, h('label', { for: 'lv' }, 'ライブ'), sel,
    h('details', { style: { marginTop: '8px' } }, h('summary', {}, '＋ ライブを追加 / 削除'), newForm, h('button', { class: 'small danger', onclick: () => { if (confirmDelete(live.name)) { lives = lives.filter((x) => x.id !== live.id); cur = lives[0]?.id || null; save(); draw(); } } }, 'このライブを削除'))),
  h('section', { class: 'card' }, h('div', { class: 'grid-2' }, ta('pred', '🔮 予想'), ta('actual', '🎤 実際'))),
  h('section', { class: 'card center' }, resBox));
  result();
}
app.append(main);
draw();
