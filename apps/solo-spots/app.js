import { h, add, render, $, store, uid, getPosition, distance, fmtDistance, mapUrl, toast, confirmDelete } from '../../shared/lib.js';

// 「ひとりで行けた」お店や場所の記録。ひとり向け度（カウンター席・入りやすさ）で評価して、次のソロ活に。
const db = store('solo-spots');
let spots = db.get('spots', []);
const app = $('#app');
const CATS = ['🍜 ごはん', '☕ カフェ', '🍺 飲み', '♨ 温泉・サウナ', '🎬 映画・ライブ', '🏞 おでかけ', '🛍 買い物'];
const TAGS = ['カウンター席', 'おひとりさま歓迎', '静か', '長居できる', '電源あり', '予約不要'];
let filter = 'all'; let here = null;
const listBox = h('div');
const save = () => db.set('spots', spots);

function draw() {
  const shown = spots.filter((s) => filter === 'all' || s.cat === filter).sort((a, b) => (here && a.lat && b.lat ? distance(here, a) - distance(here, b) : b.solo - a.solo));
  render(listBox, h('div', { class: 'tabs', role: 'tablist' }, ['all', ...CATS].map((c) => h('button', { role: 'tab', 'aria-selected': String(c === filter), onclick: () => { filter = c; draw(); } }, c === 'all' ? 'すべて' : c))),
    shown.length === 0 ? h('p', { class: 'empty card' }, 'まだ記録がありません') : h('ul', { class: 'list card' }, shown.map((s) => h('li', { style: { flexWrap: 'wrap' } },
      h('div', { class: 'grow' }, h('b', {}, `${s.cat.split(' ')[0]} ${s.name}`), h('div', { class: 'sub' }, `ひとり度 ${'★'.repeat(s.solo)}${'☆'.repeat(5 - s.solo)}${here && s.lat ? ` ・ ${fmtDistance(distance(here, s))}` : ''}`),
        s.tags.length ? h('div', { class: 'btn-row', style: { marginTop: '4px' } }, s.tags.map((t) => h('span', { class: 'pill' }, t))) : null, s.memo ? h('div', { class: 'small' }, s.memo) : null),
      s.lat ? h('a', { class: 'btn small', href: mapUrl(s.lat, s.lon), target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${s.name}を地図で見る` }, '🗺') : null,
      h('button', { class: 'small ghost', 'aria-label': `${s.name}を削除`, onclick: () => { if (confirmDelete(s.name)) { spots = spots.filter((x) => x.id !== s.id); save(); draw(); } } }, '×')))));
}
const nIn = h('input', { id: 'sn', required: true, maxlength: 40, placeholder: '店名・場所' });
const cIn = h('select', { id: 'sc' }, CATS.map((c) => h('option', {}, c)));
const rIn = h('select', { id: 'sr' }, [5, 4, 3, 2, 1].map((x) => h('option', { value: x }, '★'.repeat(x))));
const mIn = h('input', { id: 'sm', maxlength: 80, placeholder: 'メモ（任意）' });
const tagBox = h('div', { class: 'btn-row' }, TAGS.map((t) => h('button', { type: 'button', class: 'small', 'aria-pressed': 'false', onclick: (e) => e.currentTarget.setAttribute('aria-pressed', String(e.currentTarget.getAttribute('aria-pressed') !== 'true')) }, t)));
const withLoc = h('input', { type: 'checkbox', id: 'sl', checked: true });
add(app, listBox, h('form', { class: 'card', onsubmit: async (e) => {
  e.preventDefault();
  let pos = {}; if (withLoc.checked) { try { const p = await getPosition({ maximumAge: 60000 }); pos = { lat: p.coords.latitude, lon: p.coords.longitude }; } catch (err) { toast(err.message); } }
  spots.unshift({ id: uid(), name: nIn.value.trim(), cat: cIn.value, solo: +rIn.value, memo: mIn.value.trim(), tags: [...tagBox.querySelectorAll('[aria-pressed="true"]')].map((b) => b.textContent), ...pos });
  save(); nIn.value = ''; mIn.value = ''; tagBox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); toast('記録しました'); draw();
} }, h('h2', {}, 'ソロ活スポットを記録'), h('div', { class: 'field' }, h('label', { for: 'sn' }, '名前'), nIn),
  h('div', { class: 'row' }, h('div', {}, h('label', { for: 'sc' }, '種類'), cIn), h('div', {}, h('label', { for: 'sr' }, 'ひとり度'), rIn)),
  h('p', { class: 'small', style: { margin: '10px 0 6px' } }, 'よかったところ'), tagBox,
  h('div', { class: 'field', style: { marginTop: '10px' } }, h('label', { for: 'sm' }, 'メモ'), mIn),
  h('label', { for: 'sl', style: { display: 'flex', gap: '6px', color: 'var(--text)' } }, withLoc, 'いまいる場所を記録する'),
  h('button', { class: 'primary', type: 'submit', style: { marginTop: '8px' } }, '記録')));
draw();
getPosition({ maximumAge: 300000 }).then((p) => { here = { lat: p.coords.latitude, lon: p.coords.longitude }; draw(); }).catch(() => {});
