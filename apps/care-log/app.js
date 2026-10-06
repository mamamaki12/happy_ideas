import { h, add, render, $, store, uid, todayStr, fmtTime, fmtDate, share, confirmDelete, toast } from '../../shared/lib.js';

// 介護ノート: 体温・血圧・食事量・排泄・服薬・様子を記録し、ケアマネや家族に送る要約を作る。
const db = store('care-log');
let recs = db.get('recs', []);
const app = $('#app');
const listCard = h('section', { class: 'card' });
const save = () => db.set('recs', recs);
const MEAL = ['全量', '8割', '半分', '少し', '食べず'];

function addRec(rec) { recs.unshift({ id: uid(), t: Date.now(), d: todayStr(), ...rec }); save(); toast('記録しました'); draw(); }
function summary(days = 7) {
  const since = new Date(); since.setDate(since.getDate() - days + 1); const s = todayStr(since);
  const r = recs.filter((x) => x.d >= s);
  const temps = r.filter((x) => x.type === 'temp').map((x) => x.v);
  const bps = r.filter((x) => x.type === 'bp');
  const meals = r.filter((x) => x.type === 'meal');
  const notes = r.filter((x) => x.type === 'note');
  const lines = [`【${days}日間のまとめ】${fmtDate(s)}〜${fmtDate(todayStr())}`];
  if (temps.length) lines.push(`体温: 平均 ${(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)}℃（最高 ${Math.max(...temps)}℃）`);
  if (bps.length) lines.push(`血圧: ${bps.slice(0, 3).map((b) => `${b.v}`).join('、')}`);
  if (meals.length) lines.push(`食事: ${MEAL.map((m) => { const n = meals.filter((x) => x.v === m).length; return n ? `${m}${n}回` : ''; }).filter(Boolean).join('・')}`);
  lines.push(`排泄: 排尿 ${r.filter((x) => x.type === 'pee').length}回 ・ 排便 ${r.filter((x) => x.type === 'poo').length}回`);
  lines.push(`服薬: ${r.filter((x) => x.type === 'med').length}回`);
  if (notes.length) lines.push(`様子: ${notes.slice(0, 5).map((n) => `${fmtDate(n.d)} ${n.v}`).join(' ／ ')}`);
  return lines.join('\n');
}
const LABEL = { temp: '🌡 体温', bp: '🩺 血圧', meal: '🍚 食事', pee: '💧 排尿', poo: '💩 排便', med: '💊 服薬', note: '📝 様子' };
function draw() {
  const today = recs.filter((x) => x.d === todayStr());
  render(listCard, h('h2', {}, `今日の記録（${today.length}）`), today.length === 0 ? h('p', { class: 'empty' }, 'まだありません') :
    h('ul', { class: 'list' }, today.map((x) => h('li', {}, h('b', {}, fmtTime(x.t)), h('span', { class: 'grow' }, LABEL[x.type], ' ', x.v ?? ''),
      h('button', { class: 'small ghost', 'aria-label': '削除', onclick: () => { if (confirmDelete()) { recs = recs.filter((y) => y.id !== x.id); save(); draw(); } } }, '×')))),
  h('pre', { class: 'care-sum' }, summary()), h('button', { class: 'primary', onclick: () => share({ title: '介護記録のまとめ', text: summary() }) }, '📤 まとめを送る'));
}
const temp = h('input', { id: 'ct', type: 'number', step: 0.1, min: 34, max: 42, inputmode: 'decimal', placeholder: '36.5' });
const bp = h('input', { id: 'cb', placeholder: '128/82', maxlength: 9 });
const meal = h('select', { id: 'cm' }, MEAL.map((m) => h('option', {}, m)));
const note = h('input', { id: 'cn', placeholder: '例: 夕方少しぼんやり', maxlength: 80 });
add(app, 
  h('section', { class: 'card' }, h('h2', {}, 'ワンタップ記録'), h('div', { class: 'grid-3' }, ['pee', 'poo', 'med'].map((k) => h('button', { onclick: () => addRec({ type: k }) }, LABEL[k])))),
  h('section', { class: 'card' },
    h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (+temp.value) { addRec({ type: 'temp', v: +temp.value }); temp.value = ''; } } }, h('div', {}, h('label', { for: 'ct' }, '体温（℃）'), temp), h('button', { class: 'shrink', type: 'submit' }, '記録')),
    h('form', { class: 'row', style: { marginTop: '8px' }, onsubmit: (e) => { e.preventDefault(); if (/^\d{2,3}\/\d{2,3}$/.test(bp.value.trim())) { addRec({ type: 'bp', v: bp.value.trim() }); bp.value = ''; } else toast('128/82 の形で入れてください'); } }, h('div', {}, h('label', { for: 'cb' }, '血圧'), bp), h('button', { class: 'shrink', type: 'submit' }, '記録')),
    h('form', { class: 'row', style: { marginTop: '8px' }, onsubmit: (e) => { e.preventDefault(); addRec({ type: 'meal', v: meal.value }); } }, h('div', {}, h('label', { for: 'cm' }, '食事量'), meal), h('button', { class: 'shrink', type: 'submit' }, '記録')),
    h('form', { class: 'row', style: { marginTop: '8px' }, onsubmit: (e) => { e.preventDefault(); if (note.value.trim()) { addRec({ type: 'note', v: note.value.trim() }); note.value = ''; } } }, h('div', {}, h('label', { for: 'cn' }, '様子'), note), h('button', { class: 'shrink', type: 'submit' }, '記録'))),
  listCard);
draw();
