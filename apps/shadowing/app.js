import { h, render, $, store, startMic, stopStream, toast } from '../../shared/lib.js';
import { speak, stopSpeaking, synthesisSupported } from '../../shared/speech.js';

// お手本を音声合成で読み上げ → 自分の声を録音 → 交互に聞き比べる。
const db = store('shadowing');
const SETS = {
  'en-US': ['Could you tell me how to get to the station?', 'I would like to make a reservation for two.', 'It was nice talking to you.', 'Sorry, could you say that again more slowly?', 'What do you recommend?'],
  'ja-JP': ['すみません、駅までの行き方を教えてください。', 'おすすめは何ですか。', 'お会計をお願いします。', 'もう少しゆっくり話していただけますか。'],
  'zh-CN': ['请问车站怎么走？', '我想预订两个人的位子。', '谢谢你的帮助。'],
  'ko-KR': ['역까지 어떻게 가요?', '추천 메뉴가 뭐예요?', '감사합니다.'],
};
const LANGS = { 'en-US': '英語', 'ja-JP': '日本語', 'zh-CN': '中国語', 'ko-KR': '韓国語' };
const s = db.get('s', { lang: 'en-US', rate: 0.9, custom: '' });
const app = $('#app');
const sentenceBox = h('div');
const textIn = h('textarea', { id: 'tx', rows: 3, 'aria-label': '練習する文' });
const rateIn = h('input', { id: 'rate', type: 'range', min: 0.5, max: 1.3, step: 0.05, value: s.rate });
const rateLabel = h('span');
const langIn = h('select', { id: 'lang' }, Object.entries(LANGS).map(([k, l]) => h('option', { value: k, selected: k === s.lang }, l)));
const recBox = h('div', { class: 'center' });
let myClip = null; let rec = null; let stream = null;

function drawSentences() {
  render(sentenceBox, h('div', { class: 'chip-list' }, SETS[s.lang].map((t) => h('button', { class: 'small', onclick: () => { textIn.value = t; } }, t.length > 22 ? `${t.slice(0, 22)}…` : t))));
  if (!textIn.value || !SETS[s.lang].includes(textIn.value)) textIn.value = SETS[s.lang][0];
}
langIn.addEventListener('change', () => { s.lang = langIn.value; db.set('s', s); textIn.value = ''; drawSentences(); });
const updRate = () => { s.rate = +rateIn.value; rateLabel.textContent = `${s.rate.toFixed(2)}倍`; db.set('s', s); };
rateIn.addEventListener('input', updRate);

const play = () => speak(textIn.value, { lang: s.lang, rate: s.rate });
async function record() {
  if (rec?.state === 'recording') { rec.stop(); return; }
  try { stream = await startMic(); } catch (e) { return toast(e.message); }
  const chunks = []; rec = new MediaRecorder(stream);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => { stopStream(stream); myClip = new Blob(chunks, { type: rec.mimeType }); drawRec(); };
  rec.start(); drawRec();
  // 「お手本を聞きながら」重ねて話す（シャドーイング）
  await play();
  setTimeout(() => { if (rec?.state === 'recording') rec.stop(); }, 1200);
}
function drawRec() {
  const recording = rec?.state === 'recording';
  const audio = myClip ? h('audio', { controls: true, src: URL.createObjectURL(myClip), 'aria-label': '自分の声' }) : null;
  render(recBox,
    h('div', { class: 'btn-row' },
      h('button', { class: 'primary', onclick: play, disabled: !synthesisSupported() }, '🔊 お手本'),
      h('button', { class: recording ? 'danger' : '', onclick: record }, recording ? '■ 録音停止' : '🎙 重ねて話す'),
      myClip ? h('button', { onclick: async () => { await play(); const a = recBox.querySelector('audio'); a?.play(); } }, '🔁 聞き比べ') : null),
    audio,
    h('p', { class: 'small muted' }, recording ? 'お手本に少し遅れて、同じように声に出しましょう' : '「重ねて話す」でお手本の再生と録音が同時に始まります'));
}
app.append(
  h('section', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', { for: 'lang' }, '言語'), langIn), h('div', {}, h('label', { for: 'rate' }, '速さ ', rateLabel), rateIn))),
  h('section', { class: 'card' }, h('h2', {}, '練習する文'), sentenceBox, h('div', { style: { marginTop: '10px' } }, textIn)),
  h('section', { class: 'card' }, recBox),
  synthesisSupported() ? null : h('p', { class: 'error' }, 'このブラウザは音声合成に対応していません'));
updRate(); drawSentences(); drawRec();
addEventListener('pagehide', stopSpeaking);
