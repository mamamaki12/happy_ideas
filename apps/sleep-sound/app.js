import { h, add, render, $, store, blobStore, startMic, stopStream, rmsOf, wakeLock, fmtTime, uid, download, confirmDelete, toast } from '../../shared/lib.js';

// 寝ている間、一定以上の音がしたときだけ前後数秒を録音する（寝言・いびきチェック）。
const db = store('sleep-sound');
const clips = blobStore('sleep-sound');
let list = db.get('list', []);
const app = $('#app');
const lock = wakeLock();
const status = h('p', { class: 'center', 'aria-live': 'polite' }, '枕元にスマホを置き、充電しながら使ってください。');
const level = h('div', { class: 'meter' }, h('div'));
const sens = h('input', { id: 'sens', type: 'range', min: 0.005, max: 0.1, step: 0.005, value: db.get('sens', 0.02) });
const btn = h('button', { class: 'primary big', onclick: toggle }, '🌙 おやすみ（記録開始）');
const listCard = h('section', { class: 'card' });
let stream = null; let ctx = null; let rec = null; let raf = 0; let quietSince = 0; let recStart = 0;

function mimeType() { return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || ''; }

function startRec() {
  const chunks = []; recStart = Date.now();
  rec = new MediaRecorder(stream, mimeType() ? { mimeType: mimeType() } : undefined);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = async () => {
    const blob = new Blob(chunks, { type: rec?.mimeType || 'audio/webm' });
    const id = uid(); await clips.set(id, blob).catch(() => {});
    list.unshift({ id, t: recStart, sec: Math.round((Date.now() - recStart) / 1000), type: blob.type }); list = list.slice(0, 100); db.set('list', list); drawList();
  };
  rec.start(); status.textContent = `🔴 ${fmtTime(Date.now())} 音を検知して録音中…`;
}

function loop(an, buf) {
  an.getFloatTimeDomainData(buf);
  const r = rmsOf(buf);
  level.firstChild.style.width = `${Math.min(100, (r / +sens.value) * 50)}%`;
  const loud = r > +sens.value;
  if (loud) { quietSince = Date.now(); if (!rec || rec.state === 'inactive') startRec(); }
  else if (rec?.state === 'recording' && (Date.now() - quietSince > 4000 || Date.now() - recStart > 60000)) { rec.stop(); status.textContent = `待機中… これまで ${list.length} 件`; }
  raf = requestAnimationFrame(() => loop(an, buf));
}

async function toggle() {
  if (stream) {
    cancelAnimationFrame(raf); if (rec?.state === 'recording') rec.stop(); stopStream(stream); stream = null; await ctx.close(); lock.off();
    btn.textContent = '🌙 おやすみ（記録開始）'; status.textContent = 'おはようございます。記録を確認しましょう。'; return;
  }
  if (!window.MediaRecorder) { status.textContent = 'このブラウザは録音に対応していません'; return; }
  try { stream = await startMic(); } catch (e) { status.textContent = e.message; return; }
  ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 2048; ctx.createMediaStreamSource(stream).connect(an);
  await lock.on();
  if (!lock.supported) toast('画面を消すと録音が止まる端末があります');
  btn.textContent = '☀ おはよう（終了）'; status.textContent = '待機中…（音がしたら録音します）';
  loop(an, new Float32Array(an.fftSize));
}

function drawList() {
  render(listCard, h('h2', {}, `記録（${list.length}件）`),
    list.length === 0 ? h('p', { class: 'empty' }, 'まだ記録がありません') :
      h('ul', { class: 'list' }, list.slice(0, 50).map((c) => {
        const audio = h('audio', { controls: true, preload: 'none', class: 'grow', 'aria-label': `${fmtTime(c.t)}の録音` });
        clips.get(c.id).then((b) => { if (b) audio.src = URL.createObjectURL(b); }).catch(() => {});
        return h('li', { style: { flexWrap: 'wrap' } }, h('span', { class: 'sub' }, `${fmtTime(c.t)} ・ ${c.sec}秒`), audio,
          h('button', { class: 'small ghost', 'aria-label': '保存', onclick: async () => { const b = await clips.get(c.id); if (b) download(b, `sleep-${c.t}.${b.type.includes('mp4') ? 'm4a' : 'webm'}`); } }, '⬇'),
          h('button', { class: 'small ghost', 'aria-label': '削除', onclick: async () => { if (!confirmDelete()) return; list = list.filter((x) => x.id !== c.id); db.set('list', list); await clips.del(c.id).catch(() => {}); drawList(); } }, '×'));
      })));
}
sens.addEventListener('change', () => db.set('sens', +sens.value));
add(app, h('section', { class: 'card' }, status, level, h('div', { class: 'field', style: { marginTop: '10px' } }, h('label', { for: 'sens' }, '反応する音の大きさ（右ほど鈍感）'), sens), btn,
  h('p', { class: 'small muted' }, '録音は端末内にだけ保存されます。画面がスリープすると止まる場合があります。')), listCard);
drawList();
