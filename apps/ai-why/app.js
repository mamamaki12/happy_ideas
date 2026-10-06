// #107 なぜなぜ博士: 子どもの「なんで？」に、年齢に合わせた言葉で答えて読み上げる。声で質問もできる
import { h, add, $, store, toast } from '../../shared/lib.js';
import { aiNotice, bindAI } from '../../shared/ai.js';
import { listen, recognitionSupported, speak, stopSpeaking, synthesisSupported } from '../../shared/speech.js';

const db = store('ai-why');
const st = db.get('state', { age: 6 });
const log = db.get('log', []);
const app = $('#app');
const IDEAS = ['そらは なんで あおいの？', 'ねこは なんで ゴロゴロいうの？', 'なんで よるは ねむくなるの？', 'つきは なんで ついてくるの？'];

const q = h('input', { id: 'q', maxlength: 200, placeholder: 'なんで？を いれてね' });
const age = h('select', { id: 'age' }, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((a) => h('option', { value: a, selected: a === st.age }, `${a}さい`)));
age.addEventListener('change', () => { st.age = +age.value; db.set('state', st); });
let stopListen = null;
const mic = h('button', { type: 'button', class: 'why-mic', 'aria-label': 'こえで しつもんする', disabled: !recognitionSupported() }, '🎤');
mic.addEventListener('click', () => {
  if (stopListen) { stopListen(); return; }
  mic.classList.add('on');
  stopListen = listen({ onResult: (t) => { q.value = t.slice(0, 200); }, onEnd: () => { mic.classList.remove('on'); stopListen = null; if (q.value.trim()) btn.click(); }, onError: () => toast('こえを ききとれませんでした') });
});
const btn = h('button', { type: 'button', class: 'primary big' }, 'はかせに きく');
const out = h('div', { class: 'ai-out why-out', 'aria-live': 'polite' });
const logBox = h('section', { class: 'card' });

function drawLog() {
  logBox.replaceChildren(h('h2', {}, 'これまでの なんで？'));
  add(logBox, log.length ? h('ul', { class: 'list' }, log.map((x) => h('li', {}, h('details', { class: 'grow' }, h('summary', {}, x.q), h('p', { class: 'ai-text' }, x.a))))) : h('p', { class: 'empty' }, 'まだ ないよ。'));
}

bindAI(btn, out, 'why-hakase', () => {
  if (!q.value.trim()) { toast('しつもんを いれてね'); return null; }
  return { fields: { question: q.value, age: st.age } };
}, (r) => {
  log.unshift({ q: q.value.trim(), a: r.answer }); log.splice(30); db.set('log', log); drawLog();
  if (synthesisSupported()) speak(r.answer, { rate: 0.95, pitch: 1.1 });
  return [
    h('div', { class: 'why-bubble' }, h('span', { class: 'why-face', 'aria-hidden': 'true' }, '🦉'), h('p', { class: 'ai-text' }, r.answer)),
    synthesisSupported() ? h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'small', onclick: () => speak(r.answer, { rate: 0.95, pitch: 1.1 }) }, '🔊 もういちど'), h('button', { type: 'button', class: 'small ghost', onclick: stopSpeaking }, 'とめる')) : null,
    r.try ? h('div', { class: 'ai-block' }, h('b', {}, '🔬 やってみよう'), h('p', { class: 'ai-text' }, r.try)) : null,
    r.next ? h('button', { type: 'button', class: 'small', onclick: () => { q.value = r.next; btn.click(); } }, `つぎの なんで？「${r.next}」`) : null,
    h('p', { class: 'ai-disclaimer' }, 'おうちの方へ: AIの答えはまちがえることがあります。いっしょに図鑑などで確かめてみてください。'),
  ];
});

add(app, aiNotice({ sends: '入力・音声で聞いた質問の文字' }),
  h('section', { class: 'card' },
    h('div', { class: 'row' }, h('div', { class: 'grow' }, h('label', { for: 'q' }, 'しつもん'), q), h('div', { class: 'shrink' }, mic)),
    h('div', { class: 'row' }, h('div', {}, h('label', { for: 'age' }, 'こどもの ねんれい'), age)),
    h('div', { class: 'ai-meta' }, IDEAS.map((t) => h('button', { type: 'button', class: 'small ghost', onclick: () => { q.value = t; } }, t))),
    btn, out),
  logBox);
drawLog();
addEventListener('pagehide', stopSpeaking);
