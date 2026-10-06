// #102 あやしいメッセージ判定: SMS・メールの文面（またはスクショ）を貼ると、詐欺の可能性と理由・対処を教えてくれる
import { h, add, $, store, toast, fmtDateTime } from '../../shared/lib.js';
import { aiNotice, bindAI, imagePayload, photoPicker } from '../../shared/ai.js';

const db = store('ai-scam-check');
const history = db.get('history', []);
const app = $('#app');

const LEVEL = {
  high: { cls: 'danger', label: '危険度：高', icon: '🚨' },
  medium: { cls: 'warn', label: '危険度：中（注意）', icon: '⚠️' },
  low: { cls: 'ok', label: '目立った特徴なし', icon: 'ℹ️' },
};

const text = h('textarea', { id: 'msg', rows: 6, maxlength: 3000, placeholder: '例: 【○○運輸】お荷物をお届けにあがりましたが不在のため持ち帰りました。こちらからご確認ください http://…' });
const from = h('input', { id: 'from', maxlength: 100, placeholder: '例: +81 90-xxxx-xxxx、info@…' });
const pasteBtn = h('button', { type: 'button', class: 'small', onclick: async () => { try { text.value = (await navigator.clipboard.readText()).slice(0, 3000); } catch { toast('貼り付けできませんでした。長押しして「ペースト」を選んでください'); } } }, '📋 貼り付け');
const shot = photoPicker({ label: 'スクリーンショットで判定' });
const btn = h('button', { type: 'button', class: 'primary big' }, '詐欺かどうか調べる');
const out = h('div', { class: 'ai-out', 'aria-live': 'polite' });
const histBox = h('section', { class: 'card' });

function view(r) {
  const lv = LEVEL[r.level] || LEVEL.medium;
  return [
    h('div', { class: `scam-level ${lv.cls}` }, h('span', { class: 'scam-icon', 'aria-hidden': 'true' }, lv.icon), h('div', {}, h('b', {}, lv.label), h('div', {}, r.verdict))),
    r.pattern ? h('p', { class: 'ai-meta' }, h('span', { class: 'pill' }, '手口'), r.pattern) : null,
    r.reasons.length ? [h('h3', {}, 'そう判断した理由'), h('ul', {}, r.reasons.map((x) => h('li', {}, x)))] : null,
    r.actions.length ? [h('h3', {}, 'これからすること'), h('ol', {}, r.actions.map((x) => h('li', {}, x)))] : null,
    h('div', { class: 'ai-block' },
      h('b', {}, '困ったときの相談先'),
      h('div', {}, '警察相談専用電話 ', h('a', { href: 'tel:%239110' }, '#9110')),
      h('div', {}, '消費者ホットライン ', h('a', { href: 'tel:188' }, '188')),
      h('p', { class: 'ai-disclaimer' }, '「目立った特徴なし」でも安全とは限りません。リンクは押さず、公式アプリや公式サイトから確認してください。')),
  ];
}

function drawHistory() {
  histBox.replaceChildren(h('h2', {}, '調べた記録'));
  if (!history.length) { add(histBox, h('p', { class: 'empty' }, 'まだありません。判定結果は文面の最初の部分と一緒にこの端末に残ります。')); return; }
  add(histBox, h('ul', { class: 'list' }, history.map((x) => h('li', {}, h('span', { class: `pill ${(LEVEL[x.level] || LEVEL.medium).cls}` }, (LEVEL[x.level] || LEVEL.medium).label), h('div', { class: 'grow' }, h('div', {}, x.verdict), h('div', { class: 'sub' }, `${fmtDateTime(x.at)} ・ ${x.head}`))))),
  h('button', { type: 'button', class: 'small ghost', onclick: () => { history.length = 0; db.set('history', history); drawHistory(); } }, '記録を消す'));
}

bindAI(btn, out, 'scam-check', async () => {
  if (!text.value.trim() && !shot.blob) { toast('メッセージを貼り付けるか、スクリーンショットを選んでください'); return null; }
  return { fields: { text: text.value, from: from.value }, image: shot.blob ? await imagePayload(shot.blob) : null };
}, (r) => {
  history.unshift({ level: r.level, verdict: r.verdict, head: (text.value.trim() || 'スクリーンショット').slice(0, 30), at: Date.now() });
  history.splice(20); db.set('history', history); drawHistory();
  return view(r);
});

add(app, aiNotice({ sends: '貼り付けた文面・スクリーンショット' }),
  h('section', { class: 'card' },
    h('div', { class: 'field' }, h('div', { class: 'ai-meta' }, h('label', { for: 'msg', class: 'grow' }, '届いたメッセージ'), pasteBtn), text),
    h('div', { class: 'field' }, h('label', { for: 'from' }, '差出人の表示（任意）'), from),
    h('details', {}, h('summary', {}, 'スクリーンショットで調べる'), shot.el),
    btn, out),
  h('p', { class: 'muted small' }, 'メッセージ内のリンクは、このアプリでも開きません。'),
  histBox);
drawHistory();
