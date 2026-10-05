import { h, add, render, $, store, blobStore, uid, getPosition, mapUrl, fmtDateTime, confirmDelete, toast, download } from '../../shared/lib.js';
import { cameraPanel, blobImg } from '../../shared/camera.js';

// 旅の一行日記: 写真・場所・ひとことを時系列で残す。旅ごとに分けて、あとで見返す。
const db = store('trip-journal');
const photos = blobStore('trip-journal');
let trips = db.get('trips', []);
let cur = db.get('cur', trips[0]?.id || null);
const app = $('#app');
const main = h('div');
const save = () => { db.set('trips', trips); db.set('cur', cur); };
let pending = null;

function draw() {
  const trip = trips.find((t) => t.id === cur);
  const tIn = h('input', { id: 'tn', placeholder: '例: 京都 2泊3日', maxlength: 30, 'aria-label': '新しい旅の名前' });
  const newTrip = h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (!tIn.value.trim()) return; const t = { id: uid(), name: tIn.value.trim(), entries: [] }; trips.unshift(t); cur = t.id; save(); draw(); } }, h('div', {}, tIn), h('button', { class: 'shrink', type: 'submit' }, '新しい旅'));
  if (!trip) { render(main, h('section', { class: 'card' }, h('p', {}, '旅の名前を入れて始めましょう'), newTrip)); return; }
  const preview = h('div');
  const memo = h('input', { id: 'jm', placeholder: 'ひとこと（例: 抹茶パフェ最高）', maxlength: 80 });
  const cam = cameraPanel({ label: '撮る', maxSide: 1000, onPhoto: (b) => { pending = b; render(preview, blobImg(b, { class: 'thumb', alt: 'プレビュー', style: { width: '90px', height: '90px', marginTop: '8px' } })); cam.stop(); } });
  const addEntry = async (e) => {
    e.preventDefault(); const btn = e.submitter; if (btn) btn.disabled = true;
    let loc = null; try { const p = await getPosition({ maximumAge: 60000, timeout: 8000 }); loc = { lat: p.coords.latitude, lon: p.coords.longitude }; } catch { /* 位置なしでも保存 */ }
    const id = uid(); if (pending) await photos.set(id, pending).catch(() => {});
    trip.entries.unshift({ id, t: Date.now(), memo: memo.value.trim(), loc, photo: !!pending }); pending = null; save(); toast('記録しました'); draw();
  };
  const exportMd = () => { const md = `# ${trip.name}\n\n${trip.entries.slice().reverse().map((x) => `- ${fmtDateTime(x.t)} ${x.memo}${x.loc ? ` ([地図](${mapUrl(x.loc.lat, x.loc.lon)}))` : ''}`).join('\n')}\n`; download(new Blob([md], { type: 'text/markdown' }), `${trip.name}.md`); };
  render(main,
    h('section', { class: 'card' }, h('label', { for: 'tsel' }, '旅'), h('select', { id: 'tsel', onchange: (e) => { cur = e.target.value; save(); draw(); } }, trips.map((t) => h('option', { value: t.id, selected: t.id === cur }, `${t.name}（${t.entries.length}）`))),
      h('details', { style: { marginTop: '8px' } }, h('summary', {}, '旅を追加 / 書き出し'), newTrip, h('button', { class: 'small', onclick: exportMd, style: { marginTop: '8px' } }, 'Markdownで書き出す'))),
    h('form', { class: 'card', onsubmit: addEntry }, cam.el, preview, h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', {}, h('label', { for: 'jm' }, 'ひとこと'), memo), h('button', { class: 'primary shrink', type: 'submit' }, '📍 記録'))),
    h('section', { class: 'card' }, trip.entries.length === 0 ? h('p', { class: 'empty' }, 'まだ記録がありません') : h('ol', { class: 'timeline' }, trip.entries.map((x) => {
      const ph = h('div');
      if (x.photo) photos.get(x.id).then((b) => b && render(ph, blobImg(b, { class: 'tl-photo', alt: x.memo || '旅の写真' }))).catch(() => {});
      return h('li', {}, h('div', { class: 'sub' }, fmtDateTime(x.t), x.loc ? h('a', { href: mapUrl(x.loc.lat, x.loc.lon), target: '_blank', rel: 'noopener noreferrer', style: { marginLeft: '6px' } }, '📍地図') : null,
        h('button', { class: 'small ghost', 'aria-label': '削除', onclick: async () => { if (!confirmDelete()) return; trip.entries = trip.entries.filter((y) => y.id !== x.id); save(); await photos.del(x.id).catch(() => {}); draw(); } }, '×')), ph, x.memo ? h('p', {}, x.memo) : null);
    }))));
}
add(app, main);
draw();
