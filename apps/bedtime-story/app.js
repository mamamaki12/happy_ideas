import { h, render, $, store, wakeLock } from '../../shared/lib.js';
import { speak, stopSpeaking, synthesisSupported } from '../../shared/speech.js';
import { HEROES, PLACES, ITEMS, makeStory } from './logic.js';

// 主人公・場所・アイテムを選ぶと、短いお話を作ってゆっくり読み上げる。画面は暗めに。
const db = store('bedtime-story');
const s = db.get('s', { hero: HEROES[0], place: PLACES[0], item: ITEMS[0], rate: 0.8 });
const app = $('#app');
const lock = wakeLock();
const storyBox = h('div', { class: 'story', 'aria-live': 'polite' });
let playing = false; let seed = Date.now() % 1000;

const select = (key, label, opts) => h('div', {}, h('label', { for: `s-${key}` }, label), h('select', { id: `s-${key}`, onchange: (e) => { s[key] = e.target.value; db.set('s', s); draw(); } }, opts.map((o) => h('option', { selected: o === s[key] }, o))));
const playBtn = h('button', { class: 'primary big', onclick: () => (playing ? stop() : play()), disabled: !synthesisSupported() }, '🌙 よみきかせ');

function draw() {
  const lines = makeStory(s.hero, s.place, s.item, seed);
  render(storyBox, lines.map((l, i) => h('p', { 'data-i': i }, l)));
  return lines;
}
async function play() {
  const lines = draw(); playing = true; playBtn.textContent = '■ とめる'; lock.on();
  document.body.classList.add('night');
  for (let i = 0; i < lines.length && playing; i++) {
    storyBox.querySelectorAll('p').forEach((p) => p.classList.toggle('now', +p.dataset.i === i));
    storyBox.querySelector('.now')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await speak(lines[i], { lang: 'ja-JP', rate: s.rate, pitch: 1.1 });
    await new Promise((r) => setTimeout(r, 700));
  }
  stop();
}
function stop() { playing = false; stopSpeaking(); lock.off(); playBtn.textContent = '🌙 よみきかせ'; document.body.classList.remove('night'); storyBox.querySelectorAll('.now').forEach((p) => p.classList.remove('now')); }

app.append(h('section', { class: 'card' }, h('div', { class: 'row' }, select('hero', 'だれが', HEROES), select('place', 'どこで', PLACES), select('item', 'なにを', ITEMS)),
  h('div', { class: 'btn-row', style: { marginTop: '12px' } }, h('button', { onclick: () => { seed++; draw(); } }, '🎲 べつのおはなし'))),
h('section', { class: 'card' }, storyBox, playBtn,
  synthesisSupported() ? null : h('p', { class: 'notice' }, 'このブラウザは読み上げに非対応です。文章を読んであげてください。')));
draw();
addEventListener('pagehide', stop);
