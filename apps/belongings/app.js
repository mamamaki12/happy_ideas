import { h, render, $, store, blobStore, uid, toast, yen, todayStr, daysUntil, download, confirmDelete } from '../../shared/lib.js';
import { cameraPanel, blobImg } from '../../shared/camera.js';

// 持ち物台帳: 写真・購入日・価格・保証期限。CSVで書き出せる（保険請求や引越しに）。
const db = store('belongings');
const photos = blobStore('belongings');
let items = db.get('items', []);
const app = $('#app');
const save = () => db.set('items', items);
let pending = null;

const preview = h('div');
const f = {
  name: h('input', { id: 'bn', required: true, placeholder: '例: 冷蔵庫' }),
  place: h('input', { id: 'bp', placeholder: '例: キッチン', list: 'places' }),
  price: h('input', { id: 'bpr', type: 'number', inputmode: 'numeric', min: 0, placeholder: '円' }),
  bought: h('input', { id: 'bb', type: 'date', value: todayStr() }),
  warranty: h('input', { id: 'bw', type: 'date' }),
};
const places = h('datalist', { id: 'places' });
const cam = cameraPanel({ label: '撮る', maxSide: 1000, onPhoto: (b) => { pending = b; render(preview, blobImg(b, { class: 'thumb', alt: 'プレビュー', style: { width: '120px', height: '120px', marginTop: '8px' } })); cam.stop(); } });

const form = h('form', { class: 'card', onsubmit: async (e) => {
  e.preventDefault();
  const id = uid();
  if (pending) await photos.set(id, pending).catch(() => toast('写真を保存できませんでした'));
  items.push({ id, name: f.name.value.trim(), place: f.place.value.trim(), price: +f.price.value || 0, bought: f.bought.value, warranty: f.warranty.value, photo: !!pending });
  save(); pending = null; render(preview); f.name.value = ''; f.price.value = ''; f.warranty.value = '';
  toast('登録しました'); draw();
} },
  h('h2', {}, '持ち物を登録'), cam.el, preview,
  h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', {}, h('label', { for: 'bn' }, '名前'), f.name), h('div', {}, h('label', { for: 'bp' }, '場所'), f.place, places)),
  h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', {}, h('label', { for: 'bpr' }, '購入価格'), f.price), h('div', {}, h('label', { for: 'bb' }, '購入日'), f.bought), h('div', {}, h('label', { for: 'bw' }, '保証期限'), f.warranty)),
  h('button', { class: 'primary', type: 'submit', style: { marginTop: '12px' } }, '登録'));

const listCard = h('section', { class: 'card' });

const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; };
function exportCsv() {
  const rows = [['名前', '場所', '購入価格', '購入日', '保証期限'], ...items.map((i) => [i.name, i.place, i.price, i.bought, i.warranty])];
  download(new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' }), `持ち物台帳-${todayStr()}.csv`);
}

function draw() {
  render(places, [...new Set(items.map((i) => i.place).filter(Boolean))].map((p) => h('option', { value: p })));
  const total = items.reduce((s, i) => s + i.price, 0);
  const groups = Object.groupBy ? Object.groupBy(items, (i) => i.place || '場所なし') : items.reduce((g, i) => ((g[i.place || '場所なし'] ||= []).push(i), g), {});
  render(listCard,
    h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { style: { margin: 0 } }, `${items.length}点・合計 ${yen(total)}`), h('button', { class: 'small shrink', disabled: !items.length, onclick: exportCsv }, 'CSVで書き出す')),
    items.length === 0 ? h('p', { class: 'empty' }, '家電や大事なものを登録しておくと、故障や引越しのときに困りません') :
      Object.entries(groups).map(([place, list]) => h('div', {}, h('h3', { class: 'small muted' }, place),
        h('ul', { class: 'list' }, list.map((i) => {
          const thumb = h('div', { class: 'thumb' });
          if (i.photo) photos.get(i.id).then((b) => b && thumb.replaceWith(blobImg(b, { class: 'thumb', alt: i.name }))).catch(() => {});
          const w = i.warranty ? daysUntil(i.warranty) : null;
          return h('li', {}, thumb,
            h('div', { class: 'grow' }, h('b', {}, i.name), h('div', { class: 'sub' }, `${i.bought || ''} ${i.price ? yen(i.price) : ''}`)),
            w == null ? null : h('span', { class: `pill ${w < 0 ? '' : w < 60 ? 'warn' : 'ok'}` }, w < 0 ? '保証切れ' : `保証あと${w}日`),
            h('button', { class: 'small ghost', 'aria-label': `${i.name}を削除`, onclick: async () => { if (!confirmDelete(i.name)) return; items = items.filter((x) => x.id !== i.id); save(); await photos.del(i.id).catch(() => {}); draw(); } }, '×'));
        })))));
}

app.append(form, listCard);
draw();
