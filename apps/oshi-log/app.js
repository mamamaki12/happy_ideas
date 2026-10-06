import { h, add, render, $, store, uid, yen, todayStr, fmtDate, share, confirmDelete, toast } from '../../shared/lib.js';

// 推しごとの支出・参戦・イベントを記録し、年間の推し活費を集計する。
const db = store('oshi-log');
let oshis = db.get('oshis', [{ id: 'default', name: '推し', color: '#ff5fa2' }]);
let logs = db.get('logs', []);
const app = $('#app');
const KINDS = ['🎫 チケット', '🛍 グッズ', '💿 CD・配信', '🚄 遠征', '🎁 プレゼント', '📱 課金', '📝 その他'];
let year = new Date().getFullYear();
const save = () => { db.set('oshis', oshis); db.set('logs', logs); };

const oshiSel = h('select', { id: 'os' });
const kindSel = h('select', { id: 'ok' }, KINDS.map((k) => h('option', {}, k)));
const amtIn = h('input', { id: 'oa', type: 'number', inputmode: 'numeric', min: 0, placeholder: '円' });
const memoIn = h('input', { id: 'om', placeholder: '例: 東京ドーム公演', maxlength: 60 });
const dateIn = h('input', { id: 'od', type: 'date', value: todayStr() });
const summary = h('section', { class: 'card' });
const listCard = h('section', { class: 'card' });

function drawOshiSel() { render(oshiSel, oshis.map((o) => h('option', { value: o.id }, o.name))); }

function draw() {
  const ylogs = logs.filter((l) => l.date.startsWith(String(year)));
  const total = ylogs.reduce((s, l) => s + l.amount, 0);
  const events = ylogs.filter((l) => l.kind === KINDS[0]).length;
  render(summary,
    h('div', { class: 'row', style: { alignItems: 'center' } }, h('button', { class: 'small shrink', 'aria-label': '前の年', onclick: () => { year--; draw(); } }, '◀'), h('h2', { class: 'center', style: { margin: 0 } }, `${year}年の推し活`), h('button', { class: 'small shrink', 'aria-label': '次の年', onclick: () => { year++; draw(); } }, '▶')),
    h('p', { class: 'big-number' }, yen(total)),
    h('div', { class: 'grid-2' }, h('div', { class: 'stat' }, h('b', {}, `${events}`), h('span', {}, '参戦')), h('div', { class: 'stat' }, h('b', {}, yen(total / 12)), h('span', {}, '月平均'))),
    oshis.map((o) => { const t = ylogs.filter((l) => l.oshi === o.id).reduce((s, l) => s + l.amount, 0); return t ? h('div', { class: 'oshi-row' }, h('span', { class: 'dot', style: { background: o.color } }), h('span', { class: 'grow' }, o.name), h('b', {}, yen(t))) : null; }),
    h('button', { class: 'small', style: { marginTop: '10px' }, onclick: () => share({ title: '推し活まとめ', text: `${year}年の推し活: ${yen(total)}・参戦${events}回 #推し活` }) }, '共有'));
  render(listCard, h('h2', {}, '記録'), ylogs.length === 0 ? h('p', { class: 'empty' }, 'まだ記録がありません') :
    h('ul', { class: 'list' }, [...ylogs].sort((a, b) => b.date.localeCompare(a.date)).map((l) => { const o = oshis.find((x) => x.id === l.oshi) || oshis[0]; return h('li', {},
      h('span', { class: 'dot', style: { background: o.color } }),
      h('div', { class: 'grow' }, h('div', {}, l.kind, ' ', l.memo), h('div', { class: 'sub' }, `${fmtDate(l.date)} ・ ${o.name}`)), h('b', {}, yen(l.amount)),
      h('button', { class: 'small ghost', 'aria-label': '削除', onclick: () => { if (confirmDelete()) { logs = logs.filter((x) => x.id !== l.id); save(); draw(); } } }, '×')); })));
}

const newName = h('input', { id: 'nn', placeholder: '推しの名前', maxlength: 20 });
const newColor = h('input', { id: 'nc', type: 'color', value: '#7950f2' });
add(app, summary,
  h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); logs.push({ id: uid(), oshi: oshiSel.value, kind: kindSel.value, amount: +amtIn.value || 0, memo: memoIn.value.trim(), date: dateIn.value || todayStr() }); save(); amtIn.value = ''; memoIn.value = ''; toast('記録しました'); draw(); } },
    h('h2', {}, '記録する'),
    h('div', { class: 'row' }, h('div', {}, h('label', { for: 'os' }, '推し'), oshiSel), h('div', {}, h('label', { for: 'ok' }, '種類'), kindSel)),
    h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', {}, h('label', { for: 'oa' }, '金額'), amtIn), h('div', {}, h('label', { for: 'od' }, '日付'), dateIn)),
    h('div', { class: 'field', style: { marginTop: '10px' } }, h('label', { for: 'om' }, 'メモ'), memoIn),
    h('button', { class: 'primary', type: 'submit' }, '記録')),
  listCard,
  h('details', { class: 'card' }, h('summary', {}, '推しを追加'),
    h('form', { class: 'row', style: { marginTop: '8px' }, onsubmit: (e) => { e.preventDefault(); if (!newName.value.trim()) return; if (oshis.length === 1 && oshis[0].id === 'default' && !logs.length) oshis = []; oshis.push({ id: uid(), name: newName.value.trim(), color: newColor.value }); save(); newName.value = ''; drawOshiSel(); draw(); toast('推しを追加しました'); } },
      h('div', {}, h('label', { for: 'nn' }, '名前'), newName), h('div', { class: 'shrink' }, h('label', { for: 'nc' }, '推し色'), newColor), h('button', { class: 'shrink', type: 'submit' }, '追加'))));
drawOshiSel(); draw();
