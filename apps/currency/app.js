import { h, render, $, store, toast } from '../../shared/lib.js';

// 旅の通貨換算。レートは手入力（オフラインで使うため）。値札を見ながらテンキーで素早く換算。
const db = store('currency');
const CURS = { USD: ['🇺🇸', 'ドル', 150], EUR: ['🇪🇺', 'ユーロ', 163], KRW: ['🇰🇷', 'ウォン', 0.108], TWD: ['🇹🇼', '台湾ドル', 4.7], CNY: ['🇨🇳', '元', 21], THB: ['🇹🇭', 'バーツ', 4.3], GBP: ['🇬🇧', 'ポンド', 195], AUD: ['🇦🇺', '豪ドル', 99] };
const s = db.get('s', { cur: 'USD', rates: Object.fromEntries(Object.entries(CURS).map(([k, v]) => [k, v[2]])), dir: 'toJpy', fee: 0 });
const app = $('#app');
let input = '';
const display = h('p', { class: 'cur-in', 'aria-live': 'polite' });
const result = h('p', { class: 'big-number cur-out' });
const rateIn = h('input', { id: 'rt', type: 'number', step: 'any', min: 0, inputmode: 'decimal' });

function calc() {
  const [flag, name] = CURS[s.cur]; const rate = s.rates[s.cur] * (1 + s.fee / 100); const v = +input || 0;
  if (s.dir === 'toJpy') { display.textContent = `${flag} ${input || '0'} ${name}`; result.textContent = `≈ ${Math.round(v * rate).toLocaleString()} 円`; }
  else { display.textContent = `${input || '0'} 円`; result.textContent = `≈ ${flag} ${(v / rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${name}`; }
  rateIn.value = s.rates[s.cur];
}
function key(k) { if (k === 'C') input = ''; else if (k === '⌫') input = input.slice(0, -1); else if (k === '.' && input.includes('.')) return; else if (input.length < 12) input += k; calc(); }
const pad = h('div', { class: 'keypad' }, ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '⌫'].map((k) => h('button', { onclick: () => key(k), 'aria-label': k === '⌫' ? '1文字消す' : k }, k)));
document.addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; if (/^[0-9.]$/.test(e.key)) key(e.key); else if (e.key === 'Backspace') key('⌫'); else if (e.key === 'Escape') key('C'); });
const curSel = h('select', { id: 'cu', onchange: (e) => { s.cur = e.target.value; db.set('s', s); calc(); } }, Object.entries(CURS).map(([k, [f, n]]) => h('option', { value: k, selected: k === s.cur }, `${f} ${n}（${k}）`)));
rateIn.addEventListener('change', () => { const v = +rateIn.value; if (v > 0) { s.rates[s.cur] = v; db.set('s', s); calc(); toast('レートを保存しました'); } });
app.append(h('section', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', { for: 'cu' }, '通貨'), curSel), h('button', { class: 'shrink', onclick: () => { s.dir = s.dir === 'toJpy' ? 'fromJpy' : 'toJpy'; db.set('s', s); input = ''; calc(); }, 'aria-label': '換算の向きを切り替え' }, '⇅'))),
  h('section', { class: 'card center' }, display, result, pad, h('button', { class: 'ghost small', onclick: () => key('C') }, 'クリア')),
  h('section', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', { for: 'rt' }, `1${CURS[s.cur][1]} = ? 円`), rateIn),
    h('div', {}, h('label', { for: 'fee' }, 'カード手数料など（%）'), h('input', { id: 'fee', type: 'number', min: 0, max: 10, step: 0.1, value: s.fee, onchange: (e) => { s.fee = +e.target.value || 0; db.set('s', s); calc(); } }))),
    h('p', { class: 'small muted' }, '※ レートは目安の初期値です。出発前に最新のレートに更新してください。')));
calc();
