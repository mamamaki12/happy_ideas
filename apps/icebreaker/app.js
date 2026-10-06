import { h, add, render, $, store } from '../../shared/lib.js';

// 会話のきっかけになるお題カード。場面ごとにデッキを選んで、めくる。
const DECKS = {
  first: ['最近ちょっとうれしかったことは？', '子どものころ好きだった給食は？', '休日の理想の過ごし方は？', '最近ハマっているものは？', '行ってみたい国はどこ？', '自分を動物にたとえると？', '朝型？夜型？', '人生で一番おいしかったものは？', 'もし1か月休みがあったら何をする？', '最近見て面白かった動画は？'],
  family: ['今日いちばん笑ったことは？', '今日のごはんで何点？', 'いま一番ほしいものは？', '家族の好きなところを1つ', '小さいころの将来の夢は？', '今週がんばったことは？', '最近覚えた言葉は？', '明日楽しみなことは？'],
  team: ['最近の仕事で「助かった」ことは？', '自分の取扱説明書を一言で', '仕事のお気に入りの道具は？', '1日で一番集中できる時間帯は？', '今年中に挑戦したいことは？', '人生で影響を受けた本や作品は？', '学生時代の部活・サークルは？'],
  deep: ['10年前の自分に一言いうなら？', '最近、考え方が変わったことは？', '幸せだと感じる瞬間は？', '人からもらって一番うれしかった言葉は？', '大事にしている習慣は？', 'もう一度やり直せるなら、何をする？'],
};
const NAMES = { first: '🤝 はじめまして', family: '🏠 家族で', team: '💼 チームで', deep: '🌙 じっくり' };
const db = store('icebreaker');
const app = $('#app');
let deck = db.get('deck', 'first'); let order = []; let idx = -1;
const card = h('button', { class: 'ice-card', 'aria-live': 'polite', onclick: next }, h('span', {}, 'タップしてお題をめくる'));
const counter = h('p', { class: 'center muted small' });
const tabs = h('div', { class: 'tabs', role: 'tablist' });

function shuffle() { order = DECKS[deck].map((_, i) => i).sort(() => Math.random() - 0.5); idx = -1; }
function next() {
  idx = (idx + 1) % order.length; if (idx === 0) shuffle(), idx = 0;
  card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip');
  render(card, h('span', {}, DECKS[deck][order[idx]]));
  counter.textContent = `${idx + 1} / ${order.length}`;
}
function drawTabs() { render(tabs, Object.entries(NAMES).map(([k, l]) => h('button', { role: 'tab', 'aria-selected': String(k === deck), onclick: () => { deck = k; db.set('deck', deck); shuffle(); drawTabs(); render(card, h('span', {}, 'タップしてお題をめくる')); counter.textContent = ''; } }, l))); }
add(app, tabs, h('section', { class: 'card center' }, card, counter, h('button', { class: 'primary', onclick: next }, '次のお題')));
shuffle(); drawTabs();
