import { h, add, render, $, toast, fmtDuration } from '../../shared/lib.js';
import { listen, recognitionSupported } from '../../shared/speech.js';
import { countFillers, speechRate } from '../../shared/text.js';

// プレゼンや面接の練習。話す速さ（文字/分）と「えー」「あの」などのフィラーを数える。
const app = $('#app');
const big = h('p', { class: 'big-number' }, '--');
const unit = h('p', { class: 'center muted' }, '文字/分（聞きやすい目安: 300〜350）');
const transcript = h('p', { class: 'transcript', 'aria-live': 'polite' });
const fillerBox = h('div');
const timer = h('p', { class: 'center' }, '00:00');
let session = null; let on = false; let t0 = Date.now(); let iv = 0; let text = '';

function judge(r) { if (r.unit === 'wpm') return r.perMin < 110 ? 'ゆっくり' : r.perMin > 170 ? '速すぎ' : 'ちょうどいい'; return r.perMin < 250 ? 'ゆっくり' : r.perMin > 400 ? '速すぎ' : 'ちょうどいい'; }
function update(extra = '') {
  const all = text + extra; const ms = Date.now() - t0;
  const r = speechRate(all, ms);
  const ready = ms > 3000 && r.units > 0;
  big.textContent = ready ? `${Math.round(r.perMin)}` : '--';
  unit.textContent = `${r.unit} ・ ${ready ? judge(r) : '聞きやすい目安: 300〜350文字/分'}`;
  transcript.textContent = all;
  const f = countFillers(all); const total = Object.values(f).reduce((x, y) => x + y, 0);
  render(fillerBox, h('p', {}, `フィラー ${total} 回`), h('div', { class: 'btn-row' }, Object.entries(f).map(([k, v]) => h('span', { class: 'pill warn' }, `${k} ×${v}`))));
}
// Chrome の連続認識は無音が続くと切れるので、終了中でなければ自動で再開する
function run() {
  try {
    session = listen({ lang: 'ja-JP', continuous: true, onResult: (f, i) => update(f + i), onError: (m) => toast(m),
      onEnd: (f) => { text += f; if (on && Date.now() - t0 < 600000) run(); else stop(); } });
  } catch (e) { toast(e.message, 4000); stop(); }
}
const btn = h('button', { class: 'primary big', onclick: () => {
  if (on) { on = false; session?.stop(); return; }
  text = ''; t0 = Date.now(); on = true; btn.textContent = '■ 終了'; run();
  iv = setInterval(() => { timer.textContent = fmtDuration(Date.now() - t0); }, 500);
} }, '🎤 話しはじめる');
function stop() { clearInterval(iv); on = false; session = null; btn.textContent = '🎤 話しはじめる'; update(); }

add(app, h('section', { class: 'card center' }, big, unit, timer,
  recognitionSupported() ? btn : h('p', { class: 'notice' }, 'このブラウザは音声認識に非対応です（Chrome推奨）')),
h('section', { class: 'card' }, h('h2', {}, 'フィラー'), fillerBox, h('h2', {}, '文字起こし'), transcript));
update();
