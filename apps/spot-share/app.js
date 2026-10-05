import { h, add, render, $, store, uid, getPosition, distance, fmtDistance, share, toast, confirmDelete } from '../../shared/lib.js';
import { encodeData, decodeData, str } from '../../shared/urldata.js';
import { compassTo } from '../../shared/compass.js';

// ゴミ箱・トイレ・水飲み場などを記録して、URLで配る。受け取った人は一番近い場所へコンパスで案内される（日英表示）。
const db = store('spot-share');
const KINDS = { trash: ['🗑', 'ゴミ箱', 'Trash bin'], toilet: ['🚻', 'トイレ', 'Restroom'], water: ['🚰', '水飲み場', 'Water'], charge: ['🔌', '充電', 'Charging'], rest: ['🪑', '休憩所', 'Rest area'], atm: ['🏧', 'ATM', 'ATM'], smoke: ['🚬', '喫煙所', 'Smoking area'] };
let spots = db.get('spots', []);
const app = $('#app');
const save = () => db.set('spots', spots);
let filter = 'all'; let here = null; let compass = null;
const listBox = h('div'); const guide = h('section', { class: 'card hidden' });

const fromUrl = location.hash.startsWith('#p=') ? decodeData(location.hash.slice(3)) : null;
if (location.hash.startsWith('#p=')) {
  if (Array.isArray(fromUrl?.s)) {
    const got = fromUrl.s.slice(0, 200).filter((p) => KINDS[p?.k] && Number.isFinite(p.a) && Number.isFinite(p.o) && Math.abs(p.a) <= 90 && Math.abs(p.o) <= 180).map((p) => ({ id: uid(), kind: p.k, lat: p.a, lon: p.o, note: str(p.n, 60) }));
    let n = 0; for (const p of got) if (!spots.some((s) => s.kind === p.kind && distance(s, p) < 5)) { spots.push(p); n++; }
    save(); toast(`${n}か所を取り込みました / Imported ${n} spots`);
  } else toast('URLが壊れています / Invalid link');
  history.replaceState(null, '', location.pathname);
}

function guideTo(p) {
  compass?.stop(); compass = compassTo(p);
  render(guide, h('h2', {}, `${KINDS[p.kind][0]} ${KINDS[p.kind][1]} / ${KINDS[p.kind][2]}`), p.note ? h('p', {}, p.note) : null, compass.el, h('button', { class: 'small', onclick: () => { compass.stop(); guide.classList.add('hidden'); } }, '閉じる / Close'));
  guide.classList.remove('hidden'); guide.scrollIntoView({ behavior: 'smooth' }); compass.start();
}
function draw() {
  const shown = spots.filter((s) => filter === 'all' || s.kind === filter).sort((a, b) => (here ? distance(here, a) - distance(here, b) : 0));
  render(listBox, h('div', { class: 'kind-grid' }, Object.entries(KINDS).map(([k, [ic, ja, en]]) => h('button', { 'aria-pressed': String(filter === k), onclick: () => { filter = filter === k ? 'all' : k; draw(); const near = here && spots.filter((s) => s.kind === k).sort((a, b) => distance(here, a) - distance(here, b))[0]; if (filter === k && near) guideTo(near); } }, h('span', { class: 'ki' }, ic), h('span', {}, ja), h('small', {}, en)))),
    shown.length === 0 ? h('p', { class: 'empty' }, 'まだ登録がありません / No spots yet') : h('ul', { class: 'list' }, shown.slice(0, 50).map((s) => h('li', {}, h('span', { class: 'ki' }, KINDS[s.kind][0]),
      h('div', { class: 'grow' }, h('b', {}, `${KINDS[s.kind][1]} / ${KINDS[s.kind][2]}`), h('div', { class: 'sub' }, [here ? fmtDistance(distance(here, s)) : '', s.note].filter(Boolean).join(' ・ '))),
      h('button', { class: 'small', onclick: () => guideTo(s) }, '案内'),
      h('button', { class: 'small ghost', 'aria-label': '削除', onclick: () => { if (confirmDelete()) { spots = spots.filter((x) => x.id !== s.id); save(); draw(); } } }, '×')))));
}
const kindSel = h('select', { id: 'sk' }, Object.entries(KINDS).map(([k, [ic, ja]]) => h('option', { value: k }, `${ic} ${ja}`)));
const noteIn = h('input', { id: 'sn', maxlength: 60, placeholder: '例: コンビニの横（24時間）' });
add(app, guide, h('section', { class: 'card' }, listBox),
  h('form', { class: 'card', onsubmit: async (e) => { e.preventDefault(); try { const p = await getPosition({ maximumAge: 0 }); spots.unshift({ id: uid(), kind: kindSel.value, lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), note: noteIn.value.trim() }); here = { lat: p.coords.latitude, lon: p.coords.longitude }; save(); noteIn.value = ''; toast('登録しました'); draw(); } catch (err) { toast(err.message); } } },
    h('h2', {}, 'いまいる場所を登録'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'sk' }, '種類'), kindSel), h('div', {}, h('label', { for: 'sn' }, 'メモ'), noteIn)), h('button', { class: 'primary', type: 'submit', style: { marginTop: '10px' } }, '📍 登録')),
  h('section', { class: 'card' }, h('button', { class: 'big', onclick: () => {
    if (!spots.length) return toast('登録がありません');
    const url = new URL(location.href); url.hash = `p=${encodeData({ s: spots.slice(0, 150).map((s) => ({ k: s.kind, a: s.lat, o: s.lon, n: s.note })) })}`;
    share({ title: 'Spot map', text: 'ゴミ箱・トイレなどの場所リスト / Trash bins & restrooms nearby', url: url.href });
  } }, '📤 URLで配る / Share'), h('p', { class: 'small muted' }, 'お店や観光案内所がURL（QRコード）を貼っておけば、旅行者はアプリなしで近くのゴミ箱やトイレを探せます。')));
draw();
getPosition({ maximumAge: 300000 }).then((p) => { here = { lat: p.coords.latitude, lon: p.coords.longitude }; draw(); }).catch(() => {});
