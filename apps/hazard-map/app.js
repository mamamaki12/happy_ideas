import { h, add, render, $, store, blobStore, uid, getPosition, distance, fmtDistance, mapUrl, fmtDate, todayStr, download, toast, confirmDelete } from '../../shared/lib.js';
import { cameraPanel, blobImg } from '../../shared/camera.js';
import { toGeoJSON, fromGeoJSON } from '../../shared/geojson.js';

// 通学路などの「ヒヤリハット」を写真と位置で記録。GeoJSONファイルで学校・PTA・町内会に配り、取り込める（サーバーなし）。
const db = store('hazard-map');
const photos = blobStore('hazard-map');
let spots = db.get('spots', []);
const app = $('#app');
const KINDS = ['🚗 車が速い', '👀 見通しが悪い', '🚸 歩道がない', '🌙 暗い', '🚧 工事中', '⚠ その他'];
const listBox = h('div');
const save = () => db.set('spots', spots);
let pending = null; let here = null;

function draw() {
  const sorted = here ? [...spots].sort((a, b) => distance(here, a) - distance(here, b)) : spots;
  render(listBox, h('h2', {}, `記録（${spots.length}件）`), sorted.length === 0 ? h('p', { class: 'empty' }, 'まだ記録がありません') : h('ul', { class: 'list' }, sorted.map((s) => {
    const th = h('div', { class: 'thumb' });
    if (s.photo) photos.get(s.id).then((b) => b && th.replaceWith(blobImg(b, { class: 'thumb', alt: s.kind }))).catch(() => {});
    return h('li', {}, th, h('div', { class: 'grow' }, h('b', {}, s.kind), s.note ? h('div', { class: 'small' }, s.note) : null, h('div', { class: 'sub' }, `${s.date ? fmtDate(s.date) : ''}${here ? ` ・ ${fmtDistance(distance(here, s))}` : ''}${s.from ? ` ・ ${s.from}から取込` : ''}`)),
      h('a', { class: 'btn small', href: mapUrl(s.lat, s.lon), target: '_blank', rel: 'noopener noreferrer', 'aria-label': '地図で見る' }, '🗺'),
      h('button', { class: 'small ghost', 'aria-label': `${s.kind}を削除`, onclick: async () => { if (!confirmDelete()) return; spots = spots.filter((x) => x.id !== s.id); save(); await photos.del(s.id).catch(() => {}); draw(); } }, '×'));
  })));
}
const kindIn = h('select', { id: 'hk' }, KINDS.map((k) => h('option', {}, k)));
const noteIn = h('input', { id: 'hn', maxlength: 100, placeholder: '例: 朝7:30〜8:00 抜け道の車が多い' });
const preview = h('div');
const cam = cameraPanel({ label: '撮る', maxSide: 900, onPhoto: (b) => { pending = b; render(preview, blobImg(b, { class: 'thumb', alt: 'プレビュー', style: { width: '90px', height: '90px', marginTop: '8px' } })); cam.stop(); } });
const form = h('form', { class: 'card', onsubmit: async (e) => {
  e.preventDefault(); const btn = e.submitter; if (btn) btn.disabled = true;
  try {
    const p = await getPosition({ maximumAge: 0 }); const id = uid();
    if (pending) await photos.set(id, pending);
    spots.unshift({ id, lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), kind: kindIn.value, note: noteIn.value.trim(), date: todayStr(), photo: !!pending });
    pending = null; render(preview); noteIn.value = ''; save(); toast('この場所を記録しました'); here = { lat: p.coords.latitude, lon: p.coords.longitude }; draw();
  } catch (err) { toast(err.message); }
  if (btn) btn.disabled = false;
} }, h('h2', {}, 'いまいる場所を記録'), h('div', { class: 'row' }, h('div', {}, h('label', { for: 'hk' }, '種類'), kindIn)), h('div', { class: 'field', style: { marginTop: '10px' } }, h('label', { for: 'hn' }, 'くわしく'), noteIn), cam.el, preview,
  h('button', { class: 'primary big', type: 'submit', style: { marginTop: '10px' } }, '📍 記録する'));

const fileIn = h('input', { type: 'file', accept: '.geojson,.json,application/geo+json,application/json', class: 'hidden', 'aria-label': 'GeoJSONファイルを取り込む' });
fileIn.addEventListener('change', async () => {
  const f = fileIn.files?.[0]; fileIn.value = ''; if (!f) return;
  if (f.size > 2_000_000) return toast('ファイルが大きすぎます（2MBまで）');
  try {
    const pts = fromGeoJSON(JSON.parse(await f.text()), { keys: ['kind', 'note', 'date'] });
    let n = 0;
    for (const p of pts) { if (spots.some((s) => distance(s, p) < 5 && s.kind === p.kind)) continue; spots.push({ id: uid(), ...p, kind: KINDS.includes(p.kind) ? p.kind : '⚠ その他', from: f.name.slice(0, 30), photo: false }); n++; }
    save(); draw(); toast(`${n}件を取り込みました（重複${pts.length - n}件は除外）`);
  } catch (err) { toast(err.message || '読み込めませんでした'); }
});
add(app, form, h('section', { class: 'card' }, listBox, h('div', { class: 'btn-row', style: { marginTop: '10px' } },
  h('button', { class: 'small', onclick: () => { if (!spots.length) return toast('記録がありません'); download(new Blob([JSON.stringify(toGeoJSON(spots, (s) => ({ kind: s.kind, note: s.note, date: s.date })))], { type: 'application/geo+json' }), `hiyari-hatto-${todayStr()}.geojson`); } }, '📤 GeoJSONで配る'),
  h('button', { class: 'small', onclick: () => fileIn.click() }, '📥 ファイルを取り込む'), fileIn),
  h('p', { class: 'small muted' }, '書き出しファイルには写真は含まれません。GeoJSON は Googleマイマップや国土地理院の地図でも開けます。')));
draw();
getPosition({ maximumAge: 300000 }).then((p) => { here = { lat: p.coords.latitude, lon: p.coords.longitude }; draw(); }).catch(() => {});
