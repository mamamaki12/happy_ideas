import { h, render, $, store } from './shared/lib.js';
import { IDEAS, CATEGORIES } from './ideas/ideas.js';
import { BUILT } from './ideas/built.js';
import { API_LABEL } from './ideas/api-labels.js';
import { FEASIBILITY, GRADES } from './ideas/feasibility.js';

const built = new Set(BUILT);
// まず触ってほしい試作（docs/recommendations.md の上位）
const FEATURED = ['oshi-log', 'heat-guard', 'phrase-board', 'stamp-rally', 'checkin', 'price-memo', 'oshi-camera', 'pitch-meter'];
const prefs = store('gallery');
const state = { q: '', cat: prefs.get('cat', 'all'), api: prefs.get('api', 'all'), grade: prefs.get('grade', 'all'), builtOnly: prefs.get('builtOnly', false) };

// 製品版・新作（試作とは別のページ）。キーワードで探したときに、いっしょに見つかるようにする（index.html の上部と同じもの）
const PRODUCTS = [
  ['products/rally/', '㊞ ラリーメーカー', 'サーバーなしで作れる位置情報スタンプラリー。QRを貼るだけ、参加はアプリ不要', 'スタンプラリー 位置情報 GPS QRコード イベント 地域 学校'],
  ['products/oshi-techo/', '📔 推し活手帳', '支出・当落・予定・写真・年間まとめを1つに。データは端末の中だけ', '推し 推し活 チケット 当落 支出 家計簿 ライブ 通知 カメラ'],
  ['products/photo-editor/', '📷 てもとフォト', '写真をアップロードせずに編集。フィルター・カーブ・部分補正・修復・文字入れ', '写真 編集 加工 カメラ フィルター RAW グリッド'],
  ['products/use-value/', '◈ モトログ', '持ち物の1回あたりの値段・満足度・使用記録を写真と一緒に', '持ち物 買い物 節約 お金 写真 記録'],
  ['products/home-finder/', '⌂ どこだっけ', '写真・収納場所・別名で、家の中の探し物を検索', '探し物 収納 片付け 家 写真'],
  ['products/gap-time/', '◷ すきまスイッチ', '空き時間・場所・気力に合う、小さなやること', '空き時間 習慣 やること タスク'],
  ['products/cooldown-cart/', '☾ ひと晩カート', '欲しい物を寝かせて、買う・見送るを落ち着いて判断', '買い物 衝動買い 節約 お金 ほしいもの'],
  ['products/life-manual/', '▤ わたしの攻略本', '生活の発見を、未来の自分が探せるメモに', 'メモ 生活 コツ ライフハック'],
  ['products/chore-meter/', '✧ そろそろ家事', '最後にやった日から、家事の次の目安を表示', '家事 掃除 洗濯 リマインダー 家'],
  ['products/refill-forecast/', '◒ なくなる前に', '日用品の使用ペースを学んで、使い切り日を予想', '日用品 買い物 在庫 ストック 予報'],
];
/** 検索用に文字をそろえる（全角・半角、大文字・小文字、カタカナ・ひらがなを区別しない） */
const norm = (s) => String(s).normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const hit = (hay, q) => { const t = norm(hay); return norm(q).split(/\s+/).filter(Boolean).every((w) => t.includes(w)); };

// 代表的な機能だけをフィルタに出す
const API_FILTERS = ['camera', 'geolocation', 'notification', 'microphone', 'orientation', 'motion', 'speech-recognition', 'speech-synthesis', 'share', 'wake-lock', 'barcode', 'web-audio', 'claude'];

function chips(container, entries, key) {
  render(container, entries.map(([v, label]) => h('button', {
    type: 'button', 'aria-pressed': String(state[key] === v),
    onclick: () => { state[key] = v; prefs.set(key, v); update(); },
  }, label)));
}

function card(i) {
  const isBuilt = built.has(i.slug);
  const title = isBuilt ? h('a', { href: `apps/${i.slug}/`, onclick: () => remember(i.slug) }, i.name) : i.name;
  return h('li', { class: `idea${isBuilt ? ' built' : ''}` },
    h('div', { class: 'top' },
      h('span', { class: 'num' }, `#${String(i.id).padStart(3, '0')} · ${CATEGORIES[i.cat]}`),
      h('span', { class: `status ${isBuilt ? 'on' : 'off'}` }, isBuilt ? '試作あり' : (i.slug ? '準備中' : 'アイデア'))),
    h('h2', {}, title),
    h('p', {}, i.summary),
    h('p', { class: 'need' }, `ニーズ: ${i.need}`),
    FEASIBILITY[i.slug] && isBuilt ? h('p', { class: 'feas', title: FEASIBILITY[i.slug][1] }, h('span', { class: `grade g-${FEASIBILITY[i.slug][0]}` }, FEASIBILITY[i.slug][0]), ` ${GRADES[FEASIBILITY[i.slug][0]]}`) : null,
    h('div', { class: 'apis' }, i.apis.map((a) => h('span', { class: 'pill' }, API_LABEL[a] || a))));
}

function matches(i) {
  if (state.builtOnly && !built.has(i.slug)) return false;
  if (state.cat !== 'all' && i.cat !== state.cat) return false;
  if (state.api !== 'all' && !i.apis.includes(state.api)) return false;
  if (state.grade !== 'all' && FEASIBILITY[i.slug]?.[0] !== state.grade) return false;
  if (state.q) return hit(`${i.name} ${i.summary} ${i.need} ${CATEGORIES[i.cat]} ${i.apis.map((a) => API_LABEL[a] || a).join(' ')}`, state.q);
  return true;
}
const filtered = () => state.cat !== 'all' || state.api !== 'all' || state.grade !== 'all' || state.builtOnly;
function clearFilters() {
  Object.assign(state, { cat: 'all', api: 'all', grade: 'all', builtOnly: false });
  for (const k of ['cat', 'api', 'grade', 'builtOnly']) prefs.set(k, state[k]);
  update();
}
const resetBtn = h('button', { type: 'button', class: 'small', onclick: clearFilters }, '絞り込みを解除');
const productBox = h('section', { 'aria-label': '製品版・新作アプリ（検索結果）' });

function update() {
  chips($('#cats'), [['all', 'すべて'], ...Object.entries(CATEGORIES)], 'cat');
  chips($('#apis'), [['all', 'すべての機能'], ...API_FILTERS.map((a) => [a, API_LABEL[a]])], 'api');
  chips($('#grades'), [['all', 'すべての判定'], ...Object.entries(GRADES).map(([g, l]) => [g, `${g}: ${l}`])], 'grade');
  $('#builtOnly').checked = state.builtOnly;
  const list = IDEAS.filter(matches).sort((a, b) => Number(built.has(b.slug)) - Number(built.has(a.slug)) || a.id - b.id);
  render($('#grid'), list.length ? list.map(card) : h('li', { class: 'empty' }, '条件に合うアイデアがありません', filtered() ? [' ', h('button', { type: 'button', class: 'small', onclick: clearFilters }, '絞り込みを解除')] : null));
  // 前に選んだ絞り込みは覚えているので、知らないうちに件数が減って見えないよう、絞り込み中であることと解除ボタンを出す
  $('#count').textContent = `${list.length} 件を表示中${filtered() ? '（絞り込み中）' : ''}`;
  resetBtn.classList.toggle('hidden', !filtered());
  if (state.api !== 'all' || state.grade !== 'all') $('.more-filters').open = true;
  const products = state.q ? PRODUCTS.filter(([, name, summary, words]) => hit(`${name} ${summary} ${words}`, state.q)) : [];
  render(productBox, products.length ? [h('h2', { class: 'strip-h' }, '製品版・新作アプリ'), h('div', { class: 'strip' }, products.map(([href, name, summary]) => h('a', { class: 'mini', href }, h('b', {}, name), h('span', {}, summary))))] : null);
}

function remember(slug) { prefs.set('recent', [slug, ...prefs.get('recent', []).filter((x) => x !== slug)].slice(0, 6)); }
function miniCard(slug) {
  const i = IDEAS.find((x) => x.slug === slug); if (!i || !built.has(slug)) return null;
  return h('a', { class: 'mini', href: `apps/${slug}/`, onclick: () => remember(slug) }, h('b', {}, i.name), h('span', {}, i.summary));
}
const recent = prefs.get('recent', []).filter((s) => built.has(s));
render($('#featured'),
  recent.length ? [h('h2', { class: 'strip-h' }, '最近ひらいた'), h('div', { class: 'strip' }, recent.map(miniCard))] : null,
  h('h2', { class: 'strip-h' }, 'まず試してほしい'), h('div', { class: 'strip' }, FEATURED.map(miniCard)),
  h('h2', { class: 'strip-h' }, 'AIで試す（Claude API）'), h('div', { class: 'strip' }, IDEAS.filter((i) => i.ai).map((i) => miniCard(i.slug))));

render($('#stats'),
  h('div', { class: 'stat' }, h('b', {}, String(IDEAS.length)), h('span', {}, 'アイデア')),
  h('div', { class: 'stat' }, h('b', {}, String(built.size)), h('span', {}, '動く試作')),
  h('div', { class: 'stat' }, h('b', {}, String(new Set(IDEAS.flatMap((i) => i.apis)).size)), h('span', {}, '使うWeb機能')));

$('#count').after(resetBtn);
$('.filters').after(productBox);
$('#q').addEventListener('input', (e) => { state.q = e.target.value.trim(); update(); });
$('#builtOnly').addEventListener('change', (e) => { state.builtOnly = e.target.checked; prefs.set('builtOnly', state.builtOnly); update(); });
update();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
