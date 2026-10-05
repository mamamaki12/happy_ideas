import { h, add, render, $, store, getPosition, distance } from '../../shared/lib.js';
import { compassTo } from '../../shared/compass.js';
import { placeForm, placeList } from '../../shared/places.js';

// 避難場所を事前に登録しておき、災害時は圏外でも方角と距離で案内する（GPSは圏外でも動く）。
const db = store('evac-compass');
let places = db.get('places', []);
const app = $('#app');
const save = () => db.set('places', places);
const guide = h('section', { class: 'card hidden' });
const listCard = h('section', { class: 'card' });
const listBox = h('div');
let compass = null; let here = null;

function navigate(p) {
  compass?.stop();
  compass = compassTo(p);
  render(guide, h('h2', {}, `🏃 ${p.name} へ`), compass.el, h('button', { class: 'small', onclick: () => { compass.stop(); guide.classList.add('hidden'); } }, '案内を終了'));
  guide.classList.remove('hidden'); guide.scrollIntoView({ behavior: 'smooth' });
  compass.start();
}
function draw() {
  nearestBtn.classList.toggle('hidden', places.length === 0);
  placeList(listBox, places, { here, onSelect: navigate, onDelete: (p) => { places = places.filter((x) => x.id !== p.id); save(); draw(); } });
}
const nearestBtn = h('button', { class: 'primary big', style: { marginTop: '10px' }, onclick: async () => {
  try {
    const pos = await getPosition(); here = { lat: pos.coords.latitude, lon: pos.coords.longitude }; draw();
    navigate([...places].sort((a, b) => distance(here, a) - distance(here, b))[0]);
  } catch (e) { render(guide, h('p', { class: 'error' }, e.message)); guide.classList.remove('hidden'); }
} }, '🚨 いちばん近い避難場所へ');
render(listCard, h('h2', {}, '登録した避難場所'), listBox, nearestBtn);
add(app, h('p', { class: 'notice' }, '自治体のハザードマップで避難場所を確認し、平常時に登録しておきましょう。位置情報（GPS）は電波がなくても使えます。'), guide, listCard,
  placeForm({ idPrefix: 'ev', namePlaceholder: '例: ○○小学校', onAdd: (p) => { places.push(p); save(); draw(); } }));
draw();
getPosition({ maximumAge: 60000 }).then((pos) => { here = { lat: pos.coords.latitude, lon: pos.coords.longitude }; draw(); }).catch(() => {});
