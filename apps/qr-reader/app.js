import { h, render, $, store, toast, fmtDateTime, safeHttpUrl, confirmDelete } from '../../shared/lib.js';
import { scanBarcode, barcodeSupported } from '../../shared/scanner.js';
import { classify, urlWarnings, parseWifi } from './logic.js';

const db = store('qr-reader');
let history = db.get('history', []);
const app = $('#app');
const resultCard = h('section', { class: 'card hidden', 'aria-live': 'polite' });
const histCard = h('section', { class: 'card' });
const save = () => db.set('history', history.slice(0, 100));

const LABEL = { url: '🔗 URL', wifi: '📶 Wi-Fi', mail: '✉️ メール', tel: '📞 電話', contact: '👤 連絡先', product: '🛒 商品コード', 'other-scheme': '⚠ その他のリンク', text: '📝 テキスト' };

function copy(text) { navigator.clipboard?.writeText(text).then(() => toast('コピーしました'), () => toast('コピーできませんでした')); }

function show(text) {
  const kind = classify(text);
  history.unshift({ text, kind, t: Date.now() }); save(); drawHistory();
  const body = [];
  if (kind === 'url') {
    const warns = urlWarnings(text); const u = safeHttpUrl(text);
    body.push(h('p', {}, '行き先: ', h('b', {}, u ? u.hostname : '不明')));
    if (warns.length) body.push(h('div', { class: 'error' }, h('b', {}, '開く前に確認してください'), h('ul', {}, warns.map((w) => h('li', {}, w)))));
    else body.push(h('p', { class: 'pill ok' }, '目立った危険はありません'));
    if (u) body.push(h('a', { class: 'btn primary', href: u.href, target: '_blank', rel: 'noopener noreferrer' }, warns.length ? '危険を理解して開く' : '開く'));
  } else if (kind === 'wifi') {
    const w = parseWifi(text);
    body.push(h('ul', { class: 'list' }, h('li', {}, h('span', { class: 'grow' }, 'ネットワーク名'), h('b', {}, w.ssid)), h('li', {}, h('span', { class: 'grow' }, '暗号化'), w.security),
      h('li', {}, h('span', { class: 'grow' }, 'パスワード'), h('button', { class: 'small', onclick: () => copy(w.password) }, 'コピー'))));
  } else if (kind === 'product') {
    body.push(h('p', {}, 'JAN/EANなどの商品コードです。'));
  } else if (kind === 'other-scheme') {
    body.push(h('p', { class: 'error' }, 'アプリを起動するリンクの可能性があるため、自動では開きません。'));
  }
  render(resultCard, h('h2', {}, LABEL[kind]), h('pre', { class: 'qr-text' }, text), body,
    h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { onclick: () => copy(text) }, 'コピー')));
  resultCard.classList.remove('hidden');
}

async function scan() {
  try { const v = await scanBarcode({ title: 'QRコード・バーコードを枠に入れてください' }); if (v) show(v); }
  catch (e) { toast(e.message, 5000); }
}

const fileIn = h('input', { type: 'file', accept: 'image/*', class: 'hidden', 'aria-label': '画像からQRを読む' });
fileIn.addEventListener('change', async () => {
  const f = fileIn.files?.[0]; fileIn.value = '';
  if (!f) return;
  if (!barcodeSupported()) return toast('このブラウザは画像からの読み取りに非対応です');
  try {
    const codes = await new window.BarcodeDetector().detect(await createImageBitmap(f));
    if (codes.length) show(codes[0].rawValue); else toast('コードが見つかりませんでした');
  } catch { toast('読み取りに失敗しました'); }
});

function drawHistory() {
  render(histCard, h('div', { class: 'row', style: { alignItems: 'center' } }, h('h2', { style: { margin: 0 } }, '履歴'),
    h('button', { class: 'small ghost shrink', disabled: !history.length, onclick: () => { if (confirmDelete('履歴をすべて')) { history = []; save(); drawHistory(); } } }, '全消去')),
  history.length === 0 ? h('p', { class: 'empty' }, 'まだ読み取っていません') :
    h('ul', { class: 'list' }, history.slice(0, 30).map((x) => h('li', {},
      h('button', { class: 'ghost grow hist', onclick: () => show(x.text) }, h('span', {}, LABEL[x.kind] || ''), h('span', { class: 'hist-text' }, x.text)),
      h('span', { class: 'sub' }, fmtDateTime(x.t))))));
}

app.append(
  h('section', { class: 'card' },
    barcodeSupported() ? null : h('p', { class: 'notice' }, 'このブラウザは BarcodeDetector API に非対応です（iPhoneのSafariなど）。標準カメラアプリのQR読み取りを使ってください。'),
    h('div', { class: 'btn-row' }, h('button', { class: 'primary big', onclick: scan, disabled: !barcodeSupported() }, '📷 読み取る'), h('button', { onclick: () => fileIn.click(), disabled: !barcodeSupported() }, '🖼 画像から')), fileIn),
  resultCard, histCard);
drawHistory();
