import { h, render, $, store, todayStr, share } from '../../shared/lib.js';
import { CARDS } from './cards.js';

// SNSを開く代わりに、1分で読める知識カードを1枚。読んだら今日はおしまい、という「終わりのある」体験。
const db = store('micro-learn');
let read = db.get('read', {}); // { idx: date }
let saved = db.get('saved', []);
const app = $('#app');
const cardBox = h('section', { class: 'card ml-card', 'aria-live': 'polite' });
const statP = h('p', { class: 'center small muted' });
const savedCard = h('details', { class: 'card' });
const todayCount = () => Object.values(read).filter((d) => d === todayStr()).length;
const DAILY = 3;

function pickIdx() { const unread = CARDS.map((_, i) => i).filter((i) => !read[i]); const pool = unread.length ? unread : CARDS.map((_, i) => i); return pool[Math.floor(Math.random() * pool.length)]; }
function show() {
  if (todayCount() >= DAILY) { render(cardBox, h('p', { class: 'big-number' }, '🌱'), h('p', { class: 'center' }, `今日の${DAILY}枚はおしまい。スマホを置いて、少し休みましょう。`)); drawStat(); return; }
  const i = pickIdx(); const c = CARDS[i];
  const isSaved = saved.includes(i);
  render(cardBox, h('span', { class: 'pill' }, c.cat), h('h2', { class: 'ml-title' }, c.title), h('p', { class: 'ml-body' }, c.body),
    h('div', { class: 'btn-row' },
      h('button', { class: 'primary', onclick: () => { read[i] = todayStr(); db.set('read', read); show(); } }, '読んだ ✓'),
      h('button', { 'aria-pressed': String(isSaved), onclick: (e) => { saved = isSaved ? saved.filter((x) => x !== i) : [...saved, i]; db.set('saved', saved); e.currentTarget.textContent = isSaved ? '☆ 保存' : '★ 保存済み'; drawSaved(); } }, isSaved ? '★ 保存済み' : '☆ 保存'),
      h('button', { onclick: () => share({ title: c.title, text: `${c.title}\n${c.body}` }) }, '共有')));
  drawStat();
}
function drawStat() { statP.textContent = `今日 ${todayCount()}/${DAILY} 枚 ・ これまで ${Object.keys(read).length}/${CARDS.length} 枚`; }
function drawSaved() { render(savedCard, h('summary', {}, `保存したカード（${saved.length}）`), h('ul', { class: 'list' }, saved.map((i) => h('li', {}, h('div', {}, h('b', {}, CARDS[i].title), h('div', { class: 'sub' }, CARDS[i].body)))))); }
app.append(cardBox, statP, savedCard);
show(); drawSaved();
