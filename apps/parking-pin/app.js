import { h, render, $, store, blobStore, getPosition, toast, fmtDateTime, mapUrl, confirmDelete, fmtDuration } from '../../shared/lib.js';
import { cameraPanel, blobImg } from '../../shared/camera.js';
import { compassTo } from '../../shared/compass.js';

// 停めた場所を保存して、戻るときに方角と距離で案内する。
const db = store('parking-pin');
const photos = blobStore('parking-pin');
let pin = db.get('pin', null);
const app = $('#app');
const main = h('div');
let compass = null;
let timer = null;

async function savePin() {
  const btn = $('#save-pin'); if (btn) { btn.disabled = true; btn.textContent = '位置を取得中…'; }
  try {
    const p = await getPosition();
    pin = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, t: Date.now(), memo: '', photo: false };
    db.set('pin', pin); toast('停めた場所を保存しました'); draw();
  } catch (e) { toast(e.message, 4000); if (btn) { btn.disabled = false; btn.textContent = '📍 ここに停めた'; } }
}

function draw() {
  compass?.stop(); clearInterval(timer);
  if (!pin) {
    render(main, h('section', { class: 'card center' },
      h('p', { style: { fontSize: '3rem', margin: 0 } }, '🚗'),
      h('p', {}, '車や自転車を停めたら、ボタンを押すだけ。'),
      h('button', { id: 'save-pin', class: 'primary big', onclick: savePin }, '📍 ここに停めた')));
    return;
  }
  compass = compassTo(pin);
  const memoIn = h('input', { id: 'memo', value: pin.memo, placeholder: '例: B2階 青エリア 23番', oninput: (e) => { pin.memo = e.target.value; db.set('pin', pin); } });
  const photoBox = h('div');
  if (pin.photo) photos.get('pin').then((b) => b && render(photoBox, blobImg(b, { class: 'pin-photo', alt: '駐車位置の写真' }))).catch(() => {});
  const cam = cameraPanel({ label: '目印を撮る', maxSide: 900, onPhoto: async (b) => { await photos.set('pin', b); pin.photo = true; db.set('pin', pin); cam.stop(); render(photoBox, blobImg(b, { class: 'pin-photo', alt: '駐車位置の写真' })); } });
  const elapsed = h('span');
  const tick = () => { elapsed.textContent = fmtDuration(Date.now() - pin.t); };
  tick(); timer = setInterval(tick, 1000);
  render(main,
    h('section', { class: 'card' }, compass.el,
      h('p', { class: 'center small muted' }, `${fmtDateTime(pin.t)} に保存（経過 `, elapsed, '）'),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn', href: mapUrl(pin.lat, pin.lon), target: '_blank', rel: 'noopener noreferrer' }, '🗺 地図で見る'))),
    h('section', { class: 'card' }, h('h2', {}, '目印'), h('label', { for: 'memo' }, 'メモ'), memoIn, h('div', { style: { marginTop: '10px' } }, photoBox, cam.el)),
    h('button', { class: 'danger big', onclick: async () => { if (!confirmDelete('保存した駐車位置')) return; pin = null; db.remove('pin'); await photos.del('pin').catch(() => {}); draw(); } }, '戻ってきた（削除）'));
  compass.start();
}

app.append(main);
draw();
