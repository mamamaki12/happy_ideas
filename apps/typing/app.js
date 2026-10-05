import { h, add, render, $, store } from '../../shared/lib.js';
import { chunks, typeKey } from './logic.js';

// 日本語の文をローマ字で打つ練習。shi/si など複数の書き方に対応。速さ（打鍵/分）と正確さを記録。
const SENTENCES = [['今日はいい天気ですね', 'きょうはいいてんきですね'], ['ちょっと待ってください', 'ちょっとまってください'], ['新しいアプリを作りたい', 'あたらしいあぷりをつくりたい'], ['推し活は人生のエネルギー', 'おしかつはじんせいのえねるぎー'], ['冷蔵庫の中を確認する', 'れいぞうこのなかをかくにんする'], ['しっかり水分をとろう', 'しっかりすいぶんをとろう'], ['駅前のカフェで待ち合わせ', 'えきまえのかふぇでまちあわせ'], ['ゆっくり深呼吸しましょう', 'ゆっくりしんこきゅうしましょう']];
const db = store('typing');
let best = db.get('best', 0);
const app = $('#app');
const view = h('div', { class: 'type-view', tabindex: 0, 'aria-label': 'ここをタップしてローマ字で入力', role: 'textbox' });
const hidden = h('input', { class: 'type-hidden', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: false, 'aria-label': 'タイピング入力' });
const stat = h('p', { class: 'center', 'aria-live': 'polite' });
let order = []; let n = 0; let cs = []; let st = { ci: 0, buf: '' }; let pending = ''; let t0 = 0; let keys = 0; let miss = 0; let done = 0;

function load() { if (n >= order.length) { order = SENTENCES.map((_, i) => i).sort(() => Math.random() - 0.5); n = 0; } cs = chunks(SENTENCES[order[n]][1]); st = { ci: 0, buf: '' }; pending = ''; draw(); }
function draw() {
  const [kanji] = SENTENCES[order[n]];
  const typed = cs.slice(0, st.ci).map((c) => c.romaji[0]).join('');
  const rest = cs.slice(st.ci).map((c, i) => (i === 0 ? (c.romaji.find((r) => r.startsWith(st.buf)) || c.romaji[0]).slice(st.buf.length) : c.romaji[0])).join('');
  render(view, h('p', { class: 'type-kanji' }, kanji), h('p', { class: 'type-kana' }, h('span', { class: 'done' }, cs.slice(0, st.ci).map((c) => c.kana).join('')), cs.slice(st.ci).map((c) => c.kana).join('')),
    h('p', { class: 'type-roma' }, h('span', { class: 'done' }, typed + st.buf), rest));
  const min = t0 ? (Date.now() - t0) / 60000 : 0;
  stat.textContent = t0 ? `${Math.round(keys / Math.max(min, 1 / 60))} 打/分 ・ 正確さ ${Math.round((keys / Math.max(1, keys + miss)) * 100)}% ・ ${done}文 ・ 自己ベスト ${best} 打/分` : `自己ベスト ${best} 打/分`;
}
function onKey(k) {
  if (k.length !== 1) return;
  if (!t0) t0 = Date.now();
  // 「ん」を n 1文字で確定した直後の n は nn の2文字目として吸収
  if (pending === 'n' && k.toLowerCase() === 'n') { pending = ''; keys++; return draw(); }
  pending = '';
  const ns = typeKey(cs, st, k);
  if (!ns) { miss++; view.classList.remove('miss'); void view.offsetWidth; view.classList.add('miss'); return draw(); }
  keys++; st = { ci: ns.ci, buf: ns.buf }; pending = ns.pending || '';
  if (st.ci >= cs.length) { done++; n++; const kpm = Math.round(keys / ((Date.now() - t0) / 60000)); if (done >= 3 && kpm > best) { best = kpm; db.set('best', best); } load(); return; }
  draw();
}
document.addEventListener('keydown', (e) => { if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.target.tagName === 'SELECT') return; if (e.key.length === 1) { e.preventDefault(); onKey(e.key); } });
// スマホ: 隠し入力欄に入った文字を1文字ずつ処理
hidden.addEventListener('input', () => { const v = hidden.value; hidden.value = ''; for (const ch of v) onKey(ch); });
view.addEventListener('click', () => hidden.focus());
add(app, h('section', { class: 'card' }, view, hidden, stat, h('p', { class: 'small muted center' }, 'PCはそのままキーボードで。スマホは枠をタップして英字キーボードで入力。「し」は shi / si どちらでもOK。')),
  h('button', { class: 'ghost', onclick: () => { t0 = 0; keys = 0; miss = 0; done = 0; n++; load(); } }, 'リセット / 次の文'));
load();
