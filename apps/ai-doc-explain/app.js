// #105 書類かみくだき: 役所・病院・契約などの書類を撮ると、やること・期限・むずかしい言葉をやさしく説明。読み上げもできる
import { h, add, $, toast, fmtDate, daysUntil } from '../../shared/lib.js';
import { aiNotice, bindAI, imagePayload, photoPicker } from '../../shared/ai.js';
import { speak, stopSpeaking, synthesisSupported } from '../../shared/speech.js';

const app = $('#app');
const photo = photoPicker({ label: '書類を撮る・選ぶ' });
const question = h('input', { id: 'q', maxlength: 300, placeholder: '例: これは払わないといけないの？' });
const big = h('input', { type: 'checkbox', id: 'big' });
const btn = h('button', { type: 'button', class: 'primary big' }, 'やさしく説明してもらう');
const out = h('div', { class: 'ai-out doc-out', 'aria-live': 'polite' });
big.addEventListener('change', () => out.classList.toggle('large', big.checked));

const readText = (r) => [r.kind && `${r.kind}です。`, r.summary, ...r.todos.map((t) => `やること。${t.text}${t.due ? `。期限は${fmtDate(t.due)}` : ''}`), r.answer && `質問への答え。${r.answer}`].filter(Boolean).join('\n');

bindAI(btn, out, 'doc-explain', async () => {
  if (!photo.blob) { toast('先に書類の写真を撮るか選んでください'); return null; }
  return { fields: { question: question.value }, image: await imagePayload(photo.blob) };
}, (r) => [
  h('div', { class: 'ai-meta' }, r.kind ? h('span', { class: 'pill' }, r.kind) : null, r.from ? h('span', { class: 'small muted' }, r.from) : null),
  h('p', { class: 'ai-text' }, r.summary),
  synthesisSupported() ? h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'small', onclick: () => speak(readText(r), { rate: 0.9 }) }, '🔊 読み上げる'), h('button', { type: 'button', class: 'small ghost', onclick: stopSpeaking }, '止める')) : null,
  r.answer ? h('div', { class: 'ai-block' }, h('b', {}, '質問への答え'), h('p', { class: 'ai-text' }, r.answer)) : null,
  r.todos.length ? [h('h3', {}, 'やること'), h('ul', { class: 'list' }, r.todos.map((t) => h('li', {}, h('span', { class: 'grow' }, t.text), t.due ? h('span', { class: `pill ${daysUntil(t.due) <= 3 ? 'danger' : 'warn'}` }, `${fmtDate(t.due)}まで`) : null)))] : null,
  r.terms.length ? [h('h3', {}, 'むずかしい言葉'), h('dl', { class: 'terms' }, r.terms.map((t) => [h('dt', {}, t.term), h('dd', {}, t.meaning)]))] : null,
  r.cautions.length ? h('div', { class: 'ai-block' }, h('b', {}, '気をつけること'), h('ul', {}, r.cautions.map((c) => h('li', {}, c)))) : null,
  r.contact ? h('p', { class: 'small' }, '問い合わせ先: ', r.contact) : null,
  h('p', { class: 'ai-disclaimer' }, 'AIの説明はまちがえることがあります。大事な手続きは、書類の発行元に確認してください。'),
]);

add(app, aiNotice({ sends: '撮った書類の写真と質問' }),
  h('section', { class: 'card' }, photo.el,
    h('div', { class: 'field' }, h('label', { for: 'q' }, '聞きたいこと（任意）'), question),
    h('div', { class: 'ai-meta' }, big, h('label', { for: 'big' }, '文字を大きくする')),
    btn, out),
  h('p', { class: 'muted small' }, 'マイナンバーや口座番号が写っている部分は、指や紙で隠して撮ってください。'));
addEventListener('pagehide', stopSpeaking);
