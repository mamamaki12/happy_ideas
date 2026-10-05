import { h, render, $, store, wakeLock } from '../../shared/lib.js';

// 緊急時に見せる1枚のカード。血液型・持病・薬・アレルギー・連絡先。オフラインでも表示できる。
const db = store('emergency-card');
const FIELDS = [['name', '名前', 'text'], ['birth', '生年月日', 'date'], ['blood', '血液型', 'text'], ['conditions', '持病', 'textarea'], ['meds', '飲んでいる薬', 'textarea'], ['allergy', 'アレルギー', 'textarea'], ['contact1', '緊急連絡先1（名前・続柄・電話）', 'text'], ['contact2', '緊急連絡先2', 'text'], ['hospital', 'かかりつけ医', 'text'], ['note', 'その他（言語・介助の必要など）', 'textarea']];
const d = db.get('d', {});
const app = $('#app');
const lock = wakeLock();
const view = h('div', { class: 'ec-view hidden', role: 'dialog', 'aria-modal': 'true', 'aria-label': '緊急連絡カード' });
const tel = (s) => (s || '').match(/[0-9０-９][0-9０-９\-－ ]{8,}[0-9０-９]/)?.[0].normalize('NFKC').replace(/[^0-9]/g, '');

function show() {
  render(view, h('div', { class: 'ec-head' }, '🆘 緊急連絡カード / EMERGENCY'),
    h('dl', {}, FIELDS.filter(([k]) => d[k]).map(([k, l]) => [h('dt', {}, l), h('dd', {}, d[k], k.startsWith('contact') && tel(d[k]) ? h('a', { class: 'btn small primary', href: `tel:${tel(d[k])}`, style: { marginLeft: '8px' } }, '📞 電話') : null)])),
    h('button', { class: 'big', onclick: () => { view.classList.add('hidden'); lock.off(); } }, '閉じる'));
  view.classList.remove('hidden'); lock.on();
}
const form = h('form', { class: 'card', onsubmit: (e) => e.preventDefault() }, FIELDS.map(([k, l, type]) => h('div', { class: 'field' }, h('label', { for: `ec-${k}` }, l),
  type === 'textarea' ? h('textarea', { id: `ec-${k}`, rows: 2, value: d[k] || '', oninput: (e) => { d[k] = e.target.value; db.set('d', d); } }) : h('input', { id: `ec-${k}`, type, value: d[k] || '', oninput: (e) => { d[k] = e.target.value; db.set('d', d); } }))));
app.append(h('section', { class: 'card' }, h('button', { class: 'primary big', onclick: show }, '🆘 カードを表示'),
  h('p', { class: 'small muted' }, '入力内容はこの端末の中だけに保存されます（自動保存）。一度開いておけば、圏外でも表示できます。ロック画面から見られるよう、ホーム画面への追加をおすすめします。')), form, view);
