import { h, add, render, $, store, blobStore, startMic, stopStream, uid, share, download, fmtDateTime, fmtDuration, confirmDelete, toast } from '../../shared/lib.js';

// 声で手紙を送る。録音して、そのまま共有（LINEやメールに添付）できる。
const db = store('voice-letter');
const clips = blobStore('voice-letter');
let letters = db.get('letters', []);
const app = $('#app');
const MAX = 180;
const toIn = h('input', { id: 'to', placeholder: '例: おばあちゃんへ', maxlength: 30 });
const timer = h('p', { class: 'big-number' }, '00:00');
const recBtn = h('button', { class: 'rec-btn', 'aria-label': '録音開始', onclick: toggle }, '●');
const hint = h('p', { class: 'center muted', 'aria-live': 'polite' }, '赤いボタンを押して話してください（最大3分）');
const listCard = h('section', { class: 'card' });
let stream = null; let rec = null; let t0 = 0; let iv = 0;

const mime = () => ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || '';
const ext = (type) => (type.includes('mp4') ? 'm4a' : 'webm');

async function toggle() {
  if (rec?.state === 'recording') { rec.stop(); return; }
  if (!window.MediaRecorder) return toast('このブラウザは録音に対応していません');
  try { stream = await startMic(); } catch (e) { hint.textContent = e.message; return; }
  const chunks = [];
  rec = new MediaRecorder(stream, mime() ? { mimeType: mime() } : undefined);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = async () => {
    clearInterval(iv); stopStream(stream); recBtn.classList.remove('on'); recBtn.setAttribute('aria-label', '録音開始'); recBtn.textContent = '●';
    const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
    const id = uid(); await clips.set(id, blob);
    letters.unshift({ id, to: toIn.value.trim() || '名前なし', t: Date.now(), sec: Math.round((Date.now() - t0) / 1000), type: blob.type });
    db.set('letters', letters); hint.textContent = '録音しました。下から送れます。'; drawList();
  };
  rec.start(250); t0 = Date.now();
  recBtn.classList.add('on'); recBtn.setAttribute('aria-label', '録音停止'); recBtn.textContent = '■';
  hint.textContent = '録音中… もう一度押すと止まります';
  iv = setInterval(() => { const s = (Date.now() - t0) / 1000; timer.textContent = fmtDuration(s * 1000); if (s >= MAX) rec.stop(); }, 200);
}

async function send(l) {
  const b = await clips.get(l.id); if (!b) return toast('録音が見つかりません');
  const file = new File([b], `声の手紙-${l.to}.${ext(b.type)}`, { type: b.type });
  const r = await share({ title: `${l.to} 声の手紙`, text: `${l.to}　声の手紙を送ります`, files: [file] });
  if (r === 'copied' || r === 'failed') download(b, file.name);
}

function drawList() {
  render(listCard, h('h2', {}, '録音した手紙'),
    letters.length === 0 ? h('p', { class: 'empty' }, 'まだありません') :
      h('ul', { class: 'list' }, letters.map((l) => {
        const audio = h('audio', { controls: true, preload: 'none', 'aria-label': `${l.to}の録音`, class: 'grow' });
        clips.get(l.id).then((b) => { if (b) audio.src = URL.createObjectURL(b); }).catch(() => {});
        return h('li', { style: { flexWrap: 'wrap' } }, h('div', { style: { width: '100%' } }, h('b', {}, l.to), h('span', { class: 'sub' }, ` ${fmtDateTime(l.t)} ・ ${l.sec}秒`)), audio,
          h('button', { class: 'small primary', onclick: () => send(l) }, '送る'),
          h('button', { class: 'small ghost', 'aria-label': '削除', onclick: async () => { if (!confirmDelete()) return; letters = letters.filter((x) => x.id !== l.id); db.set('letters', letters); await clips.del(l.id).catch(() => {}); drawList(); } }, '×'));
      })));
}
add(app, h('section', { class: 'card center' }, h('div', { class: 'field', style: { textAlign: 'left' } }, h('label', { for: 'to' }, 'だれに？'), toIn), timer, recBtn, hint), listCard);
drawList();
