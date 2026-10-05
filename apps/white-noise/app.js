import { h, add, render, $, store, toast } from '../../shared/lib.js';

// 音声ファイルを使わずに、Web Audio でノイズや雨音・波の音を合成する。タイマー付き。
const db = store('white-noise');
const app = $('#app');
const SOUNDS = { white: '⚪ ホワイトノイズ', pink: '🌸 ピンクノイズ', brown: '🟤 ブラウンノイズ', rain: '🌧 雨音', waves: '🌊 波の音', fan: '🌀 扇風機' };
const vol = db.get('vol', { white: 0, pink: 0, brown: 0.5, rain: 0, waves: 0, fan: 0 });
let ctx = null; const gains = {}; let stopAt = 0; let timerId = 0; let playing = false;

function noiseBuffer(type) {
  const len = ctx.sampleRate * 4; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
  let b0 = 0; let b1 = 0; let b2 = 0; let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (type === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.15; }
    else if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else d[i] = w * 0.5;
  }
  return buf;
}
function build() {
  ctx = new AudioContext();
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const src = (type) => { const s = ctx.createBufferSource(); s.buffer = noiseBuffer(type); s.loop = true; s.start(); return s; };
  const chain = (key, node) => { const g = ctx.createGain(); g.gain.value = vol[key]; node.connect(g).connect(master); gains[key] = g; };
  chain('white', src('white')); chain('pink', src('pink')); chain('brown', src('brown'));
  // 雨: ピンクノイズを高域フィルタ
  const rf = ctx.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 1200; src('pink').connect(rf); chain('rain', rf);
  // 波: ブラウンノイズの音量をゆっくり揺らす
  const wg = ctx.createGain(); wg.gain.value = 0.5; src('brown').connect(wg);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; const lg = ctx.createGain(); lg.gain.value = 0.45; lfo.connect(lg).connect(wg.gain); lfo.start(); chain('waves', wg);
  // 扇風機: ブラウン + 低い唸り
  const ff = ctx.createBiquadFilter(); ff.type = 'lowpass'; ff.frequency.value = 500; src('white').connect(ff);
  const hum = ctx.createOscillator(); hum.frequency.value = 50; const hg = ctx.createGain(); hg.gain.value = 0.05; hum.connect(hg).connect(ff); hum.start(); chain('fan', ff);
}

const playBtn = h('button', { class: 'primary big', onclick: toggle }, '▶ 再生');
const timerSel = h('select', { id: 'tm', onchange: () => setTimer() }, [0, 15, 30, 60, 90].map((m) => h('option', { value: m }, m ? `${m}分で止める` : 'タイマーなし')));
const timerInfo = h('p', { class: 'small muted center', 'aria-live': 'polite' });

function setTimer() {
  clearInterval(timerId); const m = +timerSel.value;
  if (!m || !playing) { timerInfo.textContent = ''; return; }
  stopAt = Date.now() + m * 60000;
  timerId = setInterval(() => {
    const left = stopAt - Date.now();
    if (left <= 0) { clearInterval(timerId); fadeStop(); return; }
    timerInfo.textContent = `あと ${Math.ceil(left / 60000)} 分で止まります`;
  }, 1000);
}
function fadeStop() {
  const t = ctx.currentTime; Object.values(gains).forEach((g) => { g.gain.setTargetAtTime(0, t, 3); });
  setTimeout(() => { playing = false; ctx.suspend(); playBtn.textContent = '▶ 再生'; Object.entries(gains).forEach(([k, g]) => { g.gain.value = vol[k]; }); timerInfo.textContent = 'おやすみなさい'; }, 12000);
}
// 生成直後の AudioContext はユーザー操作後なら既に running なので、状態は自前で持つ
async function toggle() {
  if (!ctx) build();
  if (playing) { playing = false; await ctx.suspend(); playBtn.textContent = '▶ 再生'; clearInterval(timerId); timerInfo.textContent = ''; }
  else { playing = true; await ctx.resume(); playBtn.textContent = '❚❚ 一時停止'; setTimer(); if (Object.values(vol).every((v) => v === 0)) toast('下のスライダーで音を選んでください'); }
}

add(app, h('section', { class: 'card' }, playBtn, h('div', { class: 'field', style: { marginTop: '12px' } }, h('label', { for: 'tm' }, 'スリープタイマー'), timerSel), timerInfo),
  h('section', { class: 'card' }, h('h2', {}, 'ミックス'), Object.entries(SOUNDS).map(([k, l]) => h('div', { class: 'field' }, h('label', { for: `v-${k}` }, l),
    h('input', { id: `v-${k}`, type: 'range', min: 0, max: 1, step: 0.01, value: vol[k], oninput: (e) => { vol[k] = +e.target.value; db.set('vol', vol); if (gains[k]) gains[k].gain.setTargetAtTime(vol[k], ctx.currentTime, 0.1); } })))));
