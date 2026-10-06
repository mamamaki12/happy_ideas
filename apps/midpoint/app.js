import { h, add, render, $, store, distance, fmtDistance, mapUrl, share } from '../../shared/lib.js';
import { placeForm } from '../../shared/places.js';
import { centroid } from './logic.js';

// 参加者それぞれの出発地を入れて、みんなが集まりやすい中間地点を出す。
const db = store('midpoint');
let people = db.get('people', []);
const app = $('#app');
const save = () => db.set('people', people);
const out = h('section', { class: 'card', 'aria-live': 'polite' });
const listCard = h('section', { class: 'card' });

function draw() {
  render(listCard, h('h2', {}, `出発地（${people.length}人）`),
    people.length === 0 ? h('p', { class: 'empty' }, '2人以上の出発地を入れてください') :
      h('ul', { class: 'list' }, people.map((p) => h('li', {}, h('span', { class: 'grow' }, p.name),
        h('button', { class: 'small ghost', 'aria-label': `${p.name}を削除`, onclick: () => { people = people.filter((x) => x.id !== p.id); save(); draw(); } }, '×')))));
  if (people.length < 2) { render(out, h('p', { class: 'muted' }, '中間地点は2人以上で計算します')); return; }
  const c = centroid(people);
  const far = Math.max(...people.map((p) => distance(p, c)));
  const url = mapUrl(c.lat, c.lon);
  render(out, h('h2', {}, '🎯 中間地点'),
    h('p', {}, `${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`),
    h('ul', { class: 'list' }, people.map((p) => h('li', {}, h('span', { class: 'grow' }, p.name), h('span', {}, `直線 ${fmtDistance(distance(p, c))}`)))),
    h('p', { class: 'small muted' }, `いちばん遠い人で ${fmtDistance(far)}。近くの駅やお店を地図で探してください。`),
    h('div', { class: 'btn-row' }, h('a', { class: 'btn primary', href: url, target: '_blank', rel: 'noopener noreferrer' }, '🗺 地図で見る'),
      h('button', { onclick: () => share({ title: '待ち合わせ', text: 'このあたりで待ち合わせしませんか？', url }) }, '共有')));
}
add(app, out, listCard, placeForm({ idPrefix: 'mp', namePlaceholder: '例: Aさん（渋谷）', onAdd: (p) => { people.push(p); save(); draw(); } }));
draw();
