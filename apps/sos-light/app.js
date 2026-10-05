import { h, add, $, startCamera, stopStream, wakeLock, toast } from '../../shared/lib.js';
import { SOS } from './logic.js';

// 画面フラッシュ・ライト（対応端末）・ブザーでSOS信号を出す。
const app = $('#app');
const lock = wakeLock();
const UNIT = 220; // ms
const flash = h('div', { class: 'sos-flash hidden', role: 'button', tabindex: 0, 'aria-label': 'SOS発信中（タップで停止）' }, h('span', {}, 'SOS'));
let running = false; let stream = null; let track = null; let actx = null; let osc = null;
const useTorch = h('input', { type: 'checkbox', id: 'ut', checked: true });
const useSound = h('input', { type: 'checkbox', id: 'us', checked: true });

async function setTorch(on) { try { await track?.applyConstraints({ advanced: [{ torch: on }] }); } catch { /* 非対応 */ } }
function setSound(on) { if (osc) osc.gain.gain.setTargetAtTime(on ? 0.6 : 0, actx.currentTime, 0.005); }
async function start() {
  running = true; flash.classList.remove('hidden'); lock.on();
  if (useTorch.checked) {
    try { stream = await startCamera(document.createElement('video'), { facingMode: 'environment', width: 320, height: 240 }); track = stream.getVideoTracks()[0]; if (!track.getCapabilities?.().torch) { toast('この端末はライトを操作できません（画面で発信します）'); } }
    catch { toast('ライトは使えません。画面で発信します'); }
  }
  if (useSound.checked) {
    actx = new AudioContext(); const o = actx.createOscillator(); const g = actx.createGain(); o.type = 'square'; o.frequency.value = 2800; g.gain.value = 0; o.connect(g).connect(actx.destination); o.start(); osc = { o, gain: g };
  }
  while (running) {
    for (const [on, len] of SOS) {
      if (!running) break;
      flash.classList.toggle('on', on); setTorch(on); setSound(on);
      await new Promise((r) => setTimeout(r, len * UNIT));
    }
  }
}
function stop() { running = false; flash.classList.add('hidden'); flash.classList.remove('on'); setTorch(false); stopStream(stream); stream = null; track = null; osc?.o.stop(); actx?.close(); actx = null; osc = null; lock.off(); }
flash.addEventListener('click', stop);
flash.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter') stop(); });
add(app, h('section', { class: 'card center' }, h('button', { class: 'sos-btn', onclick: start }, 'SOS'),
  h('div', { class: 'btn-row', style: { justifyContent: 'center', margin: '12px 0' } }, h('label', { class: 'pill', for: 'ut' }, useTorch, ' ライト'), h('label', { class: 'pill', for: 'us' }, useSound, ' ブザー')),
  h('p', { class: 'small muted' }, 'モールス信号「・・・ ー ー ー ・・・」を繰り返します。画面をタップすると止まります。'),
  h('p', { class: 'small muted' }, '※ ライトの操作は Android の Chrome などに限られます（iPhoneは画面フラッシュのみ）。')), flash);
