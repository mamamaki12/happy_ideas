import { h, add, render, $, store, uid, toast, yen, fmtDate, todayStr, confirmDelete } from '../../shared/lib.js';

// 商品ごとに「いつ・どこで・いくら」を記録。最安値と前回比を見せる。
const db = store('price-memo');
let records = db.get('records', []);
const app = $('#app');
const save = () => db.set('records', records);

const itemIn = h('input', { id: 'item', list: 'items', placeholder: '例: 卵 10個', autocomplete: 'off', required: true });
const shopIn = h('input', { id: 'shop', list: 'shops', placeholder: '例: 駅前スーパー', autocomplete: 'off' });
const priceIn = h('input', { id: 'price', type: 'number', inputmode: 'numeric', min: 0, placeholder: '円', required: true });
const itemsList = h('datalist', { id: 'items' });
const shopsList = h('datalist', { id: 'shops' });
const hint = h('p', { class: 'small', 'aria-live': 'polite' });
const search = h('input', { type: 'search', placeholder: '商品名で絞り込み', 'aria-label': '商品名で絞り込み' });
const listCard = h('section', { class: 'card' });

function lastFor(item) {
  return records.filter((r) => r.item === item).sort((a, b) => b.date.localeCompare(a.date) || b.t - a.t);
}

function updateHint() {
  const item = itemIn.value.trim(); const price = +priceIn.value;
  if (!item) { hint.textContent = ''; return; }
  const hist = lastFor(item);
  if (!hist.length) { hint.textContent = 'はじめて記録する商品です'; return; }
  const min = Math.min(...hist.map((r) => r.price));
  const minR = hist.find((r) => r.price === min);
  let msg = `最安値 ${yen(min)}（${minR.shop || '店名なし'}・${fmtDate(minR.date)}）`;
  if (price > 0) {
    const diff = price - hist[0].price;
    msg += diff === 0 ? ' ／ 前回と同じ' : ` ／ 前回より ${diff > 0 ? '+' : ''}${yen(diff)}`;
    if (price < min) msg += ' 🎉 過去最安！';
    else if (price > min * 1.15) msg += ' ⚠ 最安値より15%以上高い';
  }
  hint.textContent = msg;
}
itemIn.addEventListener('input', updateHint);
priceIn.addEventListener('input', updateHint);

const form = h('form', { class: 'card', onsubmit: (e) => {
  e.preventDefault();
  const item = itemIn.value.trim(); const price = +priceIn.value;
  if (!item || !(price >= 0)) return;
  records.push({ id: uid(), item, shop: shopIn.value.trim(), price, date: todayStr(), t: Date.now() });
  save(); priceIn.value = ''; toast('記録しました'); draw(); updateHint();
} },
  h('h2', {}, '値段を記録'),
  h('div', { class: 'field' }, h('label', { for: 'item' }, '商品'), itemIn, itemsList),
  h('div', { class: 'row' },
    h('div', {}, h('label', { for: 'shop' }, 'お店'), shopIn, shopsList),
    h('div', {}, h('label', { for: 'price' }, '値段（円）'), priceIn)),
  hint,
  h('button', { type: 'submit', class: 'primary big' }, '記録する'));

search.addEventListener('input', () => draw());

function draw() {
  const uniqItems = [...new Set(records.map((r) => r.item))].sort();
  render(itemsList, uniqItems.map((v) => h('option', { value: v })));
  render(shopsList, [...new Set(records.map((r) => r.shop).filter(Boolean))].map((v) => h('option', { value: v })));
  const q = search.value.trim();
  const shown = uniqItems.filter((i) => !q || i.includes(q));
  render(listCard,
    h('h2', {}, `商品ごとの相場（${uniqItems.length}品）`),
    search,
    shown.length === 0 ? h('p', { class: 'empty' }, records.length ? '該当なし' : 'レジのあとに1つ記録してみましょう') :
      h('ul', { class: 'list' }, shown.map((item) => {
        const hist = lastFor(item);
        const prices = hist.map((r) => r.price);
        const min = Math.min(...prices); const max = Math.max(...prices);
        const minShop = hist.find((r) => r.price === min)?.shop;
        return h('li', {},
          h('details', { class: 'grow' },
            h('summary', {}, h('b', {}, item), `  最安 ${yen(min)}${minShop ? `（${minShop}）` : ''}`, prices.length > 1 ? `／最高 ${yen(max)}` : ''),
            h('ul', { class: 'list' }, hist.map((r) => h('li', {},
              h('span', { class: 'grow sub' }, `${fmtDate(r.date)} ${r.shop || '—'}`),
              h('span', {}, yen(r.price)),
              h('button', { class: 'small ghost', 'aria-label': '削除', onclick: () => { if (confirmDelete()) { records = records.filter((x) => x.id !== r.id); save(); draw(); } } }, '×'))))));
      })));
}

add(app, form, listCard);
draw();
