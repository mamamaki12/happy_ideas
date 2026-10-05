import { h, render, $, store, uid, notify, notifyButton, todayStr, confirmDelete } from '../../shared/lib.js';
import { nextBirthday } from './logic.js';

// 誕生日と、これまで贈ったものを記録。1週間前と当日に通知する。
const db = store('birthday');
let people = db.get('people', []);
const app = $('#app');
const listCard = h('section', { class: 'card' });
const save = () => db.set('people', people);

function draw() {
  const rows = people.map((p) => ({ p, ...nextBirthday(p.md, p.year, new Date()) })).sort((a, b) => a.days - b.days);
  render(listCard, h('h2', {}, 'もうすぐの誕生日'), rows.length === 0 ? h('p', { class: 'empty' }, '大切な人を登録しましょう') :
    h('ul', { class: 'list' }, rows.map(({ p, days, age }) => h('li', { style: { flexWrap: 'wrap' } },
      h('div', { class: 'grow' }, h('b', {}, p.name), h('div', { class: 'sub' }, `${p.md.replace('-', '/')}${age ? `（${age}歳になります）` : ''}${p.gifts?.length ? ` ・ 前回: ${p.gifts.at(-1)}` : ''}`)),
      h('span', { class: `pill ${days <= 7 ? 'warn' : ''}` }, days === 0 ? '🎂 今日！' : `あと${days}日`),
      h('details', { style: { width: '100%' } }, h('summary', {}, '贈ったもの'),
        h('ul', {}, (p.gifts || []).map((g) => h('li', { class: 'small' }, g))),
        h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); const inp = e.currentTarget.querySelector('input'); if (!inp.value.trim()) return; (p.gifts ||= []).push(`${new Date().getFullYear()}: ${inp.value.trim()}`); save(); draw(); } },
          h('div', {}, h('input', { placeholder: '例: ハンドクリーム', 'aria-label': `${p.name}に贈ったもの`, maxlength: 40 })), h('button', { class: 'small shrink', type: 'submit' }, '記録')),
        h('button', { class: 'small danger', onclick: () => { if (confirmDelete(p.name)) { people = people.filter((x) => x.id !== p.id); save(); draw(); } } }, '削除'))))));
  for (const r of rows) if ((r.days === 7 || r.days === 0) && db.get(`n:${r.p.id}`) !== todayStr()) { db.set(`n:${r.p.id}`, todayStr()); notify(r.days ? `1週間後は ${r.p.name} の誕生日` : `🎂 今日は ${r.p.name} の誕生日！`, r.days ? 'プレゼントの準備を' : 'おめでとうを伝えましょう'); }
}
const nIn = h('input', { id: 'bn', required: true, maxlength: 20, placeholder: '名前' });
const dIn = h('input', { id: 'bd', type: 'date', required: true });
const yIn = h('label', { class: 'toggle', style: { display: 'flex', gap: '6px', color: 'var(--text)' } }, h('input', { type: 'checkbox', id: 'by', checked: true }), '生まれ年も覚える');
app.append(listCard, h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); const [y, m, d] = dIn.value.split('-'); people.push({ id: uid(), name: nIn.value.trim(), md: `${m}-${d}`, year: $('#by').checked ? +y : null, gifts: [] }); save(); nIn.value = ''; draw(); } },
  h('h2', {}, '登録'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'bn' }, '名前'), nIn), h('div', {}, h('label', { for: 'bd' }, '誕生日'), dIn)), yIn,
  h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'primary', type: 'submit' }, '登録'), notifyButton())));
draw();
