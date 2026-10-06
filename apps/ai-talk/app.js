// #108 英会話ロールプレイ: 場面を選んで、声か文字で英語の会話を練習。AIが相手役と、やさしい添削をする
import { h, add, $, store, toast } from '../../shared/lib.js';
import { askAI, aiNotice, AIError } from '../../shared/ai.js';
import { listen, recognitionSupported, speak, stopSpeaking, synthesisSupported } from '../../shared/speech.js';

const db = store('ai-talk');
const SCENES = [['cafe', '☕ カフェで注文', 'Hi! What can I get for you today?'], ['directions', '🗺 道を聞く', 'Hi, you look a little lost. Can I help you?'], ['hotel', '🏨 ホテルのチェックイン', 'Good evening! Do you have a reservation?'], ['shopping', '🛍 買い物', 'Hello! Are you looking for anything special?'], ['smalltalk', '🙂 初対面の雑談', "Hi, I'm Alex. Nice to meet you! Where are you from?"], ['interview', '💼 英語の面接', 'Thank you for coming today. Could you tell me a little about yourself?']];
const st = db.get('state', { scene: 'cafe', level: 'beginner' });
let turns = [];
const app = $('#app');

const scene = h('select', { id: 'scene' }, SCENES.map(([v, l]) => h('option', { value: v, selected: v === st.scene }, l)));
const level = h('select', { id: 'level' }, [['beginner', 'はじめて'], ['intermediate', 'ふつう']].map(([v, l]) => h('option', { value: v, selected: v === st.level }, l)));
const chat = h('div', { class: 'talk-chat', 'aria-live': 'polite' });
const input = h('input', { id: 'say', maxlength: 300, placeholder: 'Type in English…', autocomplete: 'off', lang: 'en', 'aria-label': '英語で入力' });
const sendBtn = h('button', { type: 'submit', class: 'primary' }, '送る');
const mic = h('button', { type: 'button', 'aria-label': '英語で話す', disabled: !recognitionSupported() }, '🎤');
const hint = h('p', { class: 'small muted' });
let stopListen = null;

const say = (t) => { if (synthesisSupported()) speak(t, { lang: 'en-US', rate: st.level === 'beginner' ? 0.85 : 1 }); };
function bubble(role, text, extra) {
  const el = h('div', { class: `talk-msg ${role}` }, h('p', { lang: 'en' }, text), extra);
  chat.append(el); el.scrollIntoView?.({ block: 'nearest' });
}
function reset() {
  stopSpeaking(); turns = []; chat.replaceChildren(); hint.textContent = '';
  const first = SCENES.find((s) => s[0] === st.scene)[2];
  turns.push({ role: 'ai', text: first });
  bubble('ai', first, h('button', { type: 'button', class: 'small ghost', 'aria-label': 'もう一度聞く', onclick: () => say(first) }, '🔊'));
}
for (const [el, key] of [[scene, 'scene'], [level, 'level']]) el.addEventListener('change', () => { st[key] = el.value; db.set('state', st); reset(); });

async function send() {
  const text = input.value.trim();
  if (!text || sendBtn.disabled) return;
  if (turns.length >= 24) { toast('長くなったので、場面を選び直して新しく始めましょう'); return; }
  input.value = ''; sendBtn.disabled = true;
  bubble('me', text);
  const wait = h('div', { class: 'talk-msg ai' }, h('span', { class: 'ai-dots', 'aria-label': '返事を考えています' }, h('i'), h('i'), h('i')));
  chat.append(wait);
  try {
    const { result: r, demo } = await askAI('talk-partner', { fields: { scene: st.scene, level: st.level, text }, history: turns.slice(-12) });
    wait.remove();
    turns.push({ role: 'user', text }, { role: 'ai', text: r.reply });
    if (r.correction || r.better) chat.lastElementChild.append(h('div', { class: 'talk-fix' }, r.correction ? h('div', {}, '✏️ ', r.correction) : null, r.better ? h('div', { lang: 'en' }, '👉 ', h('b', {}, r.better)) : null));
    bubble('ai', r.reply, [h('div', { class: 'small muted' }, r.reply_ja), demo ? h('div', { class: 'pill warn' }, 'デモの例') : null, h('button', { type: 'button', class: 'small ghost', 'aria-label': 'もう一度聞く', onclick: () => say(r.reply) }, '🔊')]);
    hint.textContent = r.hint_ja ? `ヒント: ${r.hint_ja}` : '';
    say(r.reply);
  } catch (e) {
    wait.remove();
    bubble('ai', e instanceof AIError ? e.message : 'うまくいきませんでした');
  } finally { sendBtn.disabled = false; }
}
const form = h('form', { class: 'talk-form', onsubmit: (e) => { e.preventDefault(); send(); } }, mic, input, sendBtn);
mic.addEventListener('click', () => {
  if (stopListen) { stopListen(); return; }
  mic.classList.add('on');
  stopListen = listen({ lang: 'en-US', onResult: (t) => { input.value = t.slice(0, 300); }, onEnd: () => { mic.classList.remove('on'); stopListen = null; if (input.value.trim()) send(); }, onError: () => toast('聞き取れませんでした') });
});

add(app, aiNotice({ sends: 'あなたの英語の発言' }),
  h('section', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', { for: 'scene' }, '場面'), scene), h('div', {}, h('label', { for: 'level' }, 'レベル'), level))),
  h('section', { class: 'card talk-card' }, chat, hint, form, h('button', { type: 'button', class: 'small ghost', onclick: reset }, '最初からやり直す')));
reset();
addEventListener('pagehide', stopSpeaking);
