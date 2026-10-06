import { h, add, render, $, startMic, stopStream, toast, fmtTime, vibrate } from '../../shared/lib.js';
import { createPeer } from '../../shared/p2p.js';
import { connectPanel } from '../../shared/p2p-ui.js';

// サーバーなしのトランシーバー。接続コードを手で交換して、音声とチャットを直接やりとりする。
const app = $('#app');
const main = h('div');
let peer = null; let mic = null;
const log = h('ul', { class: 'chat', 'aria-live': 'polite' });
const remoteAudio = h('audio', { autoplay: true, playsinline: true, 'aria-label': '相手の声' });

function addMsg(text, mine) { log.append(h('li', { class: mine ? 'me' : 'them' }, h('span', {}, text), h('small', {}, fmtTime(Date.now())))); log.scrollTop = log.scrollHeight; }
function chatUi() {
  const input = h('input', { 'aria-label': 'メッセージ', placeholder: 'メッセージ', maxlength: 500 });
  const talk = mic ? h('button', { class: 'ptt', 'aria-label': '押している間だけ話す' }, '🎙 押して話す') : null;
  if (talk) {
    const on = (v) => { mic.getAudioTracks().forEach((t) => { t.enabled = v; }); talk.classList.toggle('on', v); if (v) vibrate(20); };
    on(false);
    talk.addEventListener('pointerdown', (e) => { e.preventDefault(); on(true); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => talk.addEventListener(ev, () => on(false)));
  }
  render(main, h('section', { class: 'card' }, talk, remoteAudio, log,
    h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); const t = input.value.trim(); if (!t) return; if (peer.send(JSON.stringify({ k: 'msg', t }))) { addMsg(t, true); input.value = ''; } else toast('まだつながっていません'); } }, h('div', {}, input), h('button', { class: 'primary shrink', type: 'submit' }, '送信')),
    h('button', { class: 'ghost small', onclick: () => { peer.close(); stopStream(mic); location.reload(); } }, '切断')));
}
async function prepare(withVoice) {
  if (withVoice) { try { mic = await startMic(); } catch (e) { toast(e.message); mic = null; } }
  peer = createPeer({
    stream: mic || undefined,
    onTrack: (s) => { remoteAudio.srcObject = s; },
    onMessage: (d) => { try { const m = JSON.parse(d); if (m.k === 'msg' && typeof m.t === 'string') { addMsg(m.t.slice(0, 500), false); vibrate(40); } } catch { /* 不正なデータは無視 */ } },
  });
  render(main, h('section', { class: 'card' }, connectPanel(peer, { onConnected: chatUi })));
}
render(main, h('section', { class: 'card' }, h('p', {}, '同じ場所にいる人や、離れた家族と直接つながります。会話はサーバーを通りません。'),
  h('div', { class: 'grid-2' }, h('button', { class: 'primary', onclick: () => prepare(true) }, '🎙 声とチャット'), h('button', { onclick: () => prepare(false) }, '💬 チャットだけ'))));
add(app, main, h('p', { class: 'small muted' }, '※ 接続の仲介（STUN）に公開サーバーを使います。中継サーバー（TURN）がないため、ネットワークによってはつながりません。'));
