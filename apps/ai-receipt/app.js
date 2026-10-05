// #109 AIレシート家計簿: レシートを撮ると品目・金額・分類まで読み取り、月ごとの家計簿にまとめる
import { h, add, render, $, store, uid, yen, toast, fmtDate, todayStr, download } from '../../shared/lib.js';
import { aiNotice, bindAI, imagePayload, photoPicker } from '../../shared/ai.js';

const CATS = ['食費', '日用品', '外食', '交通', '趣味', '医療', 'その他'];
const db = store('ai-receipt');
const receipts = db.get('receipts', []);
const app = $('#app');
const save = () => db.set('receipts', receipts);
let month = todayStr().slice(0, 7);

const photo = photoPicker({ label: 'レシートを撮る・選ぶ' });
const btn = h('button', { type: 'button', class: 'primary big' }, 'AIで読み取る');
const out = h('div', { class: 'ai-out', 'aria-live': 'polite' });
const summary = h('section', { class: 'card' });

/** 読み取り結果を確認・修正してから保存するフォーム */
function editor(r) {
  const rec = { id: uid(), store: r.store, date: r.date || todayStr(), total: r.total, items: r.items.map((i) => ({ ...i })) };
  const sum = () => rec.items.reduce((s, i) => s + i.price, 0);
  const diff = h('p', { class: 'small' });
  const showDiff = () => { const d = rec.total - sum(); diff.textContent = d === 0 ? '✓ 品目の合計とレシートの合計が一致しています' : `品目の合計（${yen(sum())}）とレシートの合計の差: ${yen(d)}。読み取りを確認してください`; diff.className = `small ${d === 0 ? 'ok-text' : 'warn-text'}`; };
  const rows = rec.items.map((it, i) => h('li', {},
    h('input', { value: it.name, 'aria-label': `${i + 1}行目の品名`, class: 'grow', oninput: (e) => { it.name = e.target.value.slice(0, 40); } }),
    h('input', { type: 'number', inputmode: 'numeric', value: it.price, 'aria-label': `${i + 1}行目の金額`, class: 'rc-price', oninput: (e) => { it.price = Math.round(+e.target.value || 0); showDiff(); } }),
    h('select', { 'aria-label': `${i + 1}行目の分類`, onchange: (e) => { it.category = e.target.value; } }, CATS.map((c) => h('option', { value: c, selected: c === it.category }, c)))));
  const node = h('div', { class: 'ai-out' },
    h('div', { class: 'row' },
      h('div', {}, h('label', { for: 'rc-store' }, '店名'), h('input', { id: 'rc-store', value: rec.store, oninput: (e) => { rec.store = e.target.value.slice(0, 40); } })),
      h('div', {}, h('label', { for: 'rc-date' }, '日付'), h('input', { id: 'rc-date', type: 'date', value: rec.date, oninput: (e) => { rec.date = e.target.value; } }))),
    h('div', {}, h('label', { for: 'rc-total' }, '合計（円）'), h('input', { id: 'rc-total', type: 'number', inputmode: 'numeric', value: rec.total, oninput: (e) => { rec.total = Math.round(+e.target.value || 0); showDiff(); } })),
    h('ul', { class: 'list rc-items' }, rows), diff,
    h('button', { type: 'button', class: 'primary', onclick: () => { if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) { toast('日付を入れてください'); return; } receipts.unshift(rec); save(); month = rec.date.slice(0, 7); drawSummary(); out.replaceChildren(); toast('家計簿に追加しました'); } }, '家計簿に追加'),
    h('p', { class: 'ai-disclaimer' }, '読み取りは間違えることがあります。金額を確認してから追加してください。'));
  showDiff();
  return node;
}

function drawSummary() {
  const list = receipts.filter((r) => r.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));
  const byCat = Object.fromEntries(CATS.map((c) => [c, 0]));
  for (const r of list) for (const i of r.items) byCat[CATS.includes(i.category) ? i.category : 'その他'] += i.price;
  const total = list.reduce((s, r) => s + r.total, 0);
  const max = Math.max(1, ...Object.values(byCat));
  const shift = (n) => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; drawSummary(); };
  render(summary,
    h('div', { class: 'ai-meta' }, h('button', { type: 'button', class: 'small ghost', 'aria-label': '前の月', onclick: () => shift(-1) }, '‹'), h('h2', { class: 'grow center' }, `${Number(month.slice(5))}月の家計簿`), h('button', { type: 'button', class: 'small ghost', 'aria-label': '次の月', onclick: () => shift(1) }, '›')),
    h('p', { class: 'big-number center' }, yen(total)),
    list.length ? [
      h('ul', { class: 'list' }, CATS.filter((c) => byCat[c]).map((c) => h('li', {}, h('span', { class: 'rc-cat' }, c), h('div', { class: 'meter grow', role: 'img', 'aria-label': `${c} ${yen(byCat[c])}` }, h('div', { style: { width: `${Math.max(0, byCat[c]) / max * 100}%` } })), h('b', {}, yen(byCat[c]))))),
      h('h3', {}, 'レシート'),
      h('ul', { class: 'list' }, list.map((r) => h('li', {}, h('div', { class: 'grow' }, h('div', {}, r.store || '店名なし'), h('div', { class: 'sub' }, `${fmtDate(r.date)} ・ ${r.items.length}品目`)), h('b', {}, yen(r.total)),
        h('button', { type: 'button', class: 'small ghost', 'aria-label': `${r.store}のレシートを削除`, onclick: () => { if (!confirm('このレシートを削除しますか？')) return; receipts.splice(receipts.indexOf(r), 1); save(); drawSummary(); } }, '×')))),
      h('button', { type: 'button', class: 'small', onclick: () => {
        const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
        const csv = ['日付,店名,品名,分類,金額', ...list.flatMap((r) => r.items.map((i) => [r.date, q(r.store), q(i.name), i.category, i.price].join(',')))].join('\n');
        download(new Blob([`﻿${csv}`], { type: 'text/csv' }), `kakeibo-${month}.csv`);
      } }, 'CSVで書き出す'),
    ] : h('p', { class: 'empty' }, 'この月のレシートはまだありません。'));
}

bindAI(btn, out, 'receipt-reader', async () => {
  if (!photo.blob) { toast('先にレシートの写真を撮るか選んでください'); return null; }
  return { image: await imagePayload(photo.blob) };
}, (r) => editor(r));

add(app, aiNotice({ sends: '撮ったレシートの写真' }), h('section', { class: 'card' }, photo.el, btn, out), summary);
drawSummary();
