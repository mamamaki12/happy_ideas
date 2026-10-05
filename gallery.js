import { h, render, $, store } from './shared/lib.js';
import { IDEAS, CATEGORIES } from './ideas/ideas.js';
import { BUILT } from './ideas/built.js';
import { API_LABEL } from './ideas/api-labels.js';

const built = new Set(BUILT);
const prefs = store('gallery');
const state = { q: '', cat: prefs.get('cat', 'all'), api: prefs.get('api', 'all'), builtOnly: prefs.get('builtOnly', false) };

// 代表的な機能だけをフィルタに出す
const API_FILTERS = ['camera', 'geolocation', 'notification', 'microphone', 'orientation', 'motion', 'speech-recognition', 'speech-synthesis', 'share', 'wake-lock', 'barcode', 'web-audio'];

function chips(container, entries, key) {
  render(container, entries.map(([v, label]) => h('button', {
    type: 'button', 'aria-pressed': String(state[key] === v),
    onclick: () => { state[key] = v; prefs.set(key, v); update(); },
  }, label)));
}

function card(i) {
  const isBuilt = built.has(i.slug);
  const title = isBuilt ? h('a', { href: `apps/${i.slug}/` }, i.name) : i.name;
  return h('li', { class: `idea${isBuilt ? ' built' : ''}` },
    h('div', { class: 'top' },
      h('span', { class: 'num' }, `#${String(i.id).padStart(3, '0')} · ${CATEGORIES[i.cat]}`),
      h('span', { class: `status ${isBuilt ? 'on' : 'off'}` }, isBuilt ? '試作あり' : (i.slug ? '準備中' : 'アイデア'))),
    h('h2', {}, title),
    h('p', {}, i.summary),
    h('p', { class: 'need' }, `ニーズ: ${i.need}`),
    h('div', { class: 'apis' }, i.apis.map((a) => h('span', { class: 'pill' }, API_LABEL[a] || a))));
}

function matches(i) {
  if (state.builtOnly && !built.has(i.slug)) return false;
  if (state.cat !== 'all' && i.cat !== state.cat) return false;
  if (state.api !== 'all' && !i.apis.includes(state.api)) return false;
  if (state.q) {
    const hay = `${i.name} ${i.summary} ${i.need} ${CATEGORIES[i.cat]} ${i.apis.map((a) => API_LABEL[a] || a).join(' ')}`.toLowerCase();
    return state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  }
  return true;
}

function update() {
  chips($('#cats'), [['all', 'すべて'], ...Object.entries(CATEGORIES)], 'cat');
  chips($('#apis'), [['all', 'すべての機能'], ...API_FILTERS.map((a) => [a, API_LABEL[a]])], 'api');
  $('#builtOnly').checked = state.builtOnly;
  const list = IDEAS.filter(matches).sort((a, b) => Number(built.has(b.slug)) - Number(built.has(a.slug)) || a.id - b.id);
  render($('#grid'), list.length ? list.map(card) : h('li', { class: 'empty' }, '条件に合うアイデアがありません'));
  $('#count').textContent = `${list.length} 件を表示中`;
}

render($('#stats'),
  h('div', { class: 'stat' }, h('b', {}, String(IDEAS.length)), h('span', {}, 'アイデア')),
  h('div', { class: 'stat' }, h('b', {}, String(built.size)), h('span', {}, '動く試作')),
  h('div', { class: 'stat' }, h('b', {}, String(new Set(IDEAS.flatMap((i) => i.apis)).size)), h('span', {}, '使うWeb機能')));

$('#q').addEventListener('input', (e) => { state.q = e.target.value.trim(); update(); });
$('#builtOnly').addEventListener('change', (e) => { state.builtOnly = e.target.checked; prefs.set('builtOnly', state.builtOnly); update(); });
update();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
