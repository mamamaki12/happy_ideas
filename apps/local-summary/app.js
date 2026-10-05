import { h, add, render, $, toast } from '../../shared/lib.js';
import { summarize } from './logic.js';

// 文章を「端末の中だけ」で要約する。Chrome の内蔵AI（Summarizer API）が使えれば使い、なければ自前の抽出型要約に切り替える。
const app = $('#app');
const ta = h('textarea', { id: 'src', rows: 10, maxlength: 20000, placeholder: 'ここに長い文章を貼り付けてください（ニュース、議事録、メールなど）' });
const n = h('select', { id: 'n' }, [2, 3, 5].map((x) => h('option', { value: x, selected: x === 3 }, `${x}文`)));
const out = h('section', { class: 'card', 'aria-live': 'polite' });
const status = h('p', { class: 'small' });

async function aiAvailable() {
  try { if ('Summarizer' in self) { const a = await self.Summarizer.availability(); return a === 'available' || a === 'downloadable' ? a : null; } } catch { /* 非対応 */ }
  return null;
}
async function run(useAi) {
  const text = ta.value.trim(); if (text.length < 30) return toast('もう少し長い文章を入れてください');
  const t0 = performance.now();
  if (useAi) {
    try {
      render(out, h('p', { class: 'muted' }, '端末内AIで要約中…（初回はモデルのダウンロードがあります）'));
      const s = await self.Summarizer.create({ type: 'key-points', format: 'plain-text', length: 'short', outputLanguage: 'ja' });
      const r = await s.summarize(text);
      render(out, h('h2', {}, '要約（端末内AI）'), h('p', { class: 'sum' }, r), h('p', { class: 'small muted' }, `${Math.round(performance.now() - t0)}ms`));
      return;
    } catch { toast('端末内AIが使えなかったため、簡易要約に切り替えます'); }
  }
  const lines = summarize(text, +n.value);
  render(out, h('h2', {}, '要約（簡易・抽出型）'), h('ol', {}, lines.map((l) => h('li', {}, l))),
    h('p', { class: 'small muted' }, `${text.length}文字 → ${lines.join('').length}文字（${Math.round((lines.join('').length / text.length) * 100)}%）・${Math.round(performance.now() - t0)}ms・通信なし`));
}
add(app, h('section', { class: 'card' }, status, h('label', { for: 'src' }, '文章'), ta,
  h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', { class: 'shrink' }, h('label', { for: 'n' }, '長さ'), n), h('button', { class: 'primary', id: 'go' }, '要約する'))), out);
aiAvailable().then((ai) => {
  status.textContent = ai ? '✅ このブラウザは端末内AI（Summarizer API）が使えます。文章は外部に送られません。' : 'ℹ 端末内AIは使えないため、簡易要約（重要な文の抜き出し）を使います。文章は外部に送られません。';
  $('#go').addEventListener('click', () => run(!!ai));
});
