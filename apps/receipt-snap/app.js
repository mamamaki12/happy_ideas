import { h, add, render, $, store, blobStore, uid, toast, yen, todayStr, fmtDate, confirmDelete } from '../../shared/lib.js';
import { cameraPanel, blobImg } from '../../shared/camera.js';

// レシートを撮って金額とカテゴリだけ入れる家計簿。写真は IndexedDB、記録は localStorage。
const db = store('receipt-snap');
const photos = blobStore('receipt-snap');
let entries = db.get('entries', []);
const CATS = ['🍙 食費', '🧴 日用品', '🍻 交際', '🚃 交通', '🎮 趣味', '💊 医療', '📦 その他'];
const app = $('#app');
let pending = null; // 撮影したばかりの写真
let month = todayStr().slice(0, 7);
const save = () => db.set('entries', entries);

const preview = h('div', { class: 'receipt-preview' });
const amountIn = h('input', { id: 'amt', type: 'number', inputmode: 'numeric', min: 0, placeholder: '合計金額', required: true });
const catIn = h('select', { id: 'cat' }, CATS.map((c) => h('option', {}, c)));
const dateIn = h('input', { id: 'date', type: 'date', value: todayStr() });
const memoIn = h('input', { id: 'memo', placeholder: '店名など（任意）' });

const cam = cameraPanel({ label: 'レシートを撮る', maxSide: 1200, onPhoto: (blob) => {
  pending = blob; render(preview, blobImg(blob, { class: 'receipt-img', alt: '撮影したレシート' }));
  cam.stop(); amountIn.focus();
} });

const form = h('form', { class: 'card', onsubmit: async (e) => {
  e.preventDefault();
  const id = uid();
  if (pending) await photos.set(id, pending).catch(() => toast('写真を保存できませんでした'));
  entries.push({ id, amount: +amountIn.value, cat: catIn.value, date: dateIn.value || todayStr(), memo: memoIn.value.trim(), photo: !!pending });
  save(); pending = null; render(preview); amountIn.value = ''; memoIn.value = '';
  month = (dateIn.value || todayStr()).slice(0, 7);
  toast('記録しました'); draw();
} },
  h('h2', {}, '1. 撮る → 2. 金額を入れる'),
  cam.el, preview,
  h('div', { class: 'row', style: { marginTop: '12px' } },
    h('div', {}, h('label', { for: 'amt' }, '金額（円）'), amountIn),
    h('div', {}, h('label', { for: 'cat' }, 'カテゴリ'), catIn)),
  h('div', { class: 'row', style: { marginTop: '10px' } },
    h('div', {}, h('label', { for: 'date' }, '日付'), dateIn),
    h('div', {}, h('label', { for: 'memo' }, 'メモ'), memoIn)),
  h('button', { type: 'submit', class: 'primary big', style: { marginTop: '12px' } }, '記録する'));

const summary = h('section', { class: 'card' });
const listCard = h('section', { class: 'card' });

function shiftMonth(n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  draw();
}

function draw() {
  const list = entries.filter((e) => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));
  const total = list.reduce((s, e) => s + e.amount, 0);
  const byCat = CATS.map((c) => [c, list.filter((e) => e.cat === c).reduce((s, e) => s + e.amount, 0)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  render(summary,
    h('div', { class: 'row', style: { alignItems: 'center' } },
      h('button', { class: 'small shrink', 'aria-label': '前の月', onclick: () => shiftMonth(-1) }, '◀'),
      h('h2', { class: 'center', style: { margin: 0 } }, `${month.replace('-', '年')}月`),
      h('button', { class: 'small shrink', 'aria-label': '次の月', onclick: () => shiftMonth(1) }, '▶')),
    h('p', { class: 'big-number' }, yen(total)),
    byCat.map(([c, v]) => h('div', { class: 'cat-row' }, h('span', {}, c), h('div', { class: 'meter grow' }, h('div', { style: { width: `${(v / total) * 100}%` } })), h('span', { class: 'small' }, yen(v)))));
  render(listCard, h('h2', {}, '明細'),
    list.length === 0 ? h('p', { class: 'empty' }, 'この月の記録はありません') :
      h('ul', { class: 'list' }, list.map((e) => {
        const thumb = h('div', { class: 'thumb' });
        if (e.photo) photos.get(e.id).then((b) => b && thumb.replaceWith(blobImg(b, { class: 'thumb', alt: 'レシート' }))).catch(() => {});
        return h('li', {}, thumb,
          h('div', { class: 'grow' }, h('div', {}, e.cat, e.memo ? h('span', { class: 'muted' }, ` ${e.memo}`) : null), h('div', { class: 'sub' }, fmtDate(e.date))),
          h('b', {}, yen(e.amount)),
          h('button', { class: 'small ghost', 'aria-label': '削除', onclick: async () => { if (!confirmDelete()) return; entries = entries.filter((x) => x.id !== e.id); save(); await photos.del(e.id).catch(() => {}); draw(); } }, '×'));
      })));
}

add(app, form, summary, listCard);
draw();
