import { h, add, render, $, store, uid, toast, notify, notifyButton, daysUntil, todayStr, showError, confirmDelete } from '../../shared/lib.js';
import { scanBarcode, barcodeSupported } from '../../shared/scanner.js';

const db = store('fridge-keeper');
let items = db.get('items', []);
const names = db.get('barcodeNames', {}); // バーコード → 前回登録した名前
const stats = db.get('stats', { eaten: 0, wasted: 0 });
const app = $('#app');

const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return todayStr(d); };
const save = () => { db.set('items', items); db.set('stats', stats); db.set('barcodeNames', names); };

function badge(days) {
  if (days < 0) return h('span', { class: 'pill danger' }, `${-days}日過ぎ`);
  if (days === 0) return h('span', { class: 'pill danger' }, '今日まで');
  if (days <= 2) return h('span', { class: 'pill warn' }, `あと${days}日`);
  return h('span', { class: 'pill' }, `あと${days}日`);
}

const nameIn = h('input', { id: 'name', required: true, placeholder: '例: 牛乳', autocomplete: 'off' });
const dateIn = h('input', { id: 'expiry', type: 'date', value: addDays(3) });
const qtyIn = h('input', { id: 'qty', type: 'number', min: 1, value: 1, inputmode: 'numeric' });
let pendingBarcode = null;

const quick = [['+1日', 1], ['+3日', 3], ['+1週', 7], ['+1か月', 30]].map(([l, n]) =>
  h('button', { type: 'button', class: 'small', onclick: () => { dateIn.value = addDays(n); } }, l));

async function onScan() {
  try {
    const code = await scanBarcode({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
    if (!code) return;
    pendingBarcode = code;
    if (names[code]) { nameIn.value = names[code]; toast(`前回の「${names[code]}」を入力しました`); }
    else { toast(`バーコード ${code} を読み取りました。名前を入力してください`); nameIn.focus(); }
  } catch (e) { showError(form, e.message); }
}

const form = h('form', { class: 'card', onsubmit: (e) => {
  e.preventDefault();
  const name = nameIn.value.trim();
  if (!name) return;
  items.push({ id: uid(), name, expiry: dateIn.value || addDays(3), qty: Math.max(1, +qtyIn.value || 1), barcode: pendingBarcode, added: Date.now() });
  if (pendingBarcode) names[pendingBarcode] = name;
  pendingBarcode = null;
  save(); nameIn.value = ''; qtyIn.value = 1; nameIn.focus();
  toast(`「${name}」を追加しました`);
  draw();
} },
  h('h2', {}, '食品を追加'),
  h('div', { class: 'field' }, h('label', { for: 'name' }, '名前'), nameIn),
  h('div', { class: 'row' },
    h('div', {}, h('label', { for: 'expiry' }, '期限'), dateIn),
    h('div', { class: 'shrink', style: { width: '90px' } }, h('label', { for: 'qty' }, '個数'), qtyIn)),
  h('div', { class: 'btn-row', style: { margin: '8px 0 12px' } }, quick),
  h('div', { class: 'btn-row' },
    h('button', { type: 'button', onclick: onScan, disabled: !barcodeSupported(), title: barcodeSupported() ? '' : 'このブラウザはバーコード読み取り非対応' }, '📷 バーコード'),
    h('button', { type: 'submit', class: 'primary' }, '追加する')),
  barcodeSupported() ? null : h('p', { class: 'muted small' }, 'このブラウザはバーコード読み取りに非対応です（iPhoneのSafariなど）。手入力で使えます。'));

const listCard = h('section', { class: 'card', 'aria-labelledby': 'list-h' });
const statCard = h('section', { class: 'card' });

function finish(it, kind) {
  it.qty -= 1;
  stats[kind] += 1;
  if (it.qty <= 0) items = items.filter((x) => x.id !== it.id);
  save(); draw();
  toast(kind === 'eaten' ? '食べきり！えらい' : '記録しました。次は早めに使いましょう');
}

function draw() {
  const sorted = [...items].sort((a, b) => a.expiry.localeCompare(b.expiry));
  render(listCard,
    h('h2', { id: 'list-h' }, `冷蔵庫の中（${items.length}品）`),
    sorted.length === 0 ? h('p', { class: 'empty' }, 'まだ何もありません。買ってきたものを登録しましょう。') :
      h('ul', { class: 'list' }, sorted.map((it) => h('li', {},
        h('div', { class: 'grow' },
          h('div', {}, it.name, it.qty > 1 ? h('span', { class: 'muted' }, ` ×${it.qty}`) : null),
          h('div', { class: 'sub' }, `期限 ${it.expiry.slice(5).replace('-', '/')}`)),
        badge(daysUntil(it.expiry)),
        h('button', { class: 'small', 'aria-label': `${it.name}を食べた`, onclick: () => finish(it, 'eaten') }, '食べた'),
        h('button', { class: 'small ghost', 'aria-label': `${it.name}を捨てた`, onclick: () => { if (confirmDelete(`「${it.name}」を捨てた記録にして`)) finish(it, 'wasted'); } }, '捨てた')))));
  const total = stats.eaten + stats.wasted;
  render(statCard,
    h('h2', {}, '食べきり率'),
    h('div', { class: 'grid-3' },
      h('div', { class: 'stat' }, h('b', {}, total ? `${Math.round((stats.eaten / total) * 100)}%` : '—'), h('span', {}, '食べきり率')),
      h('div', { class: 'stat' }, h('b', {}, String(stats.eaten)), h('span', {}, '食べた')),
      h('div', { class: 'stat' }, h('b', {}, String(stats.wasted)), h('span', {}, '捨てた'))),
    h('div', { style: { marginTop: '12px' } }, notifyButton()));
}

// 1日1回、期限が近いものを通知する
function checkSoon() {
  const soon = items.filter((it) => daysUntil(it.expiry) <= 1);
  if (!soon.length || db.get('notifiedOn') === todayStr()) return;
  db.set('notifiedOn', todayStr());
  notify('期限が近い食品があります', soon.map((s) => s.name).join('、'));
}

add(app, form, listCard, statCard);
draw();
checkSoon();
