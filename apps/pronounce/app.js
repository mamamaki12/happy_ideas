import { h, add, render, $, store, toast } from '../../shared/lib.js';
import { listen, speak, recognitionSupported } from '../../shared/speech.js';
import { similarity } from '../../shared/text.js';

// 英文を読み上げて、音声認識の結果とお手本の一致度を出す。聞き取られなかった単語を色で示す。
const db = store('pronounce');
let history = db.get('history', []);
const SENTENCES = ['The weather is really nice today.', 'Could I have a glass of water, please?', 'I think we should take the next train.', 'Thirty three free throws.', 'She sells seashells by the seashore.', 'Where is the nearest convenience store?', 'Rice and lice are different words.', 'I would like to work in a global team.'];
const app = $('#app');
let target = SENTENCES[0];
const targetBox = h('p', { class: 'target' });
const heard = h('p', { class: 'muted center', 'aria-live': 'polite' });
const scoreBox = h('div', { class: 'center' });
const histCard = h('section', { class: 'card' });

function drawTarget(words) {
  render(targetBox, words ? words.map((w) => h('span', { class: w.ok ? 'ok-word' : 'ng-word' }, `${w.w} `)) : target);
}
function pick(i) { target = SENTENCES[i]; drawTarget(); heard.textContent = ''; render(scoreBox); }

const micBtn = h('button', { class: 'primary big', onclick: () => {
  try {
    micBtn.disabled = true; heard.textContent = '🎤 話してください…';
    listen({ lang: 'en-US', onResult: (f, i) => { heard.textContent = f + i; }, onError: (m) => toast(m),
      onEnd: (f) => {
        micBtn.disabled = false;
        if (!f) { heard.textContent = '聞き取れませんでした'; return; }
        const r = similarity(target, f); const pct = Math.round(r.score * 100);
        heard.textContent = `認識結果: “${f}”`; drawTarget(r.words);
        render(scoreBox, h('p', { class: 'big-number' }, `${pct}点`), h('p', {}, pct >= 90 ? '🎉 すばらしい！' : pct >= 70 ? '👍 あと少し' : '赤い単語を意識してもう一度'));
        history.unshift({ t: Date.now(), s: target, pct }); history = history.slice(0, 50); db.set('history', history); drawHist();
      } });
  } catch (e) { micBtn.disabled = false; toast(e.message, 4000); }
} }, '🎤 読んでみる');

function drawHist() {
  const avg = history.length ? Math.round(history.reduce((a, b) => a + b.pct, 0) / history.length) : 0;
  render(histCard, h('h2', {}, `これまで（平均 ${avg}点・${history.length}回）`),
    h('ul', { class: 'list' }, history.slice(0, 8).map((x) => h('li', {}, h('span', { class: 'grow small' }, x.s), h('b', {}, `${x.pct}`)))));
}
add(app, 
  h('section', { class: 'card' }, h('label', { for: 'sel' }, 'お題'), h('select', { id: 'sel', onchange: (e) => pick(+e.target.value) }, SENTENCES.map((t, i) => h('option', { value: i }, t)))),
  h('section', { class: 'card center' }, targetBox, h('button', { class: 'small', onclick: () => speak(target, { lang: 'en-US', rate: 0.85 }) }, '🔊 お手本を聞く'),
    recognitionSupported() ? micBtn : h('p', { class: 'notice' }, 'このブラウザは音声認識に非対応です（Chrome推奨）'), heard, scoreBox),
  histCard);
drawTarget(); drawHist();
