// カメラ部品: ライブプレビュー + 撮影 + 前後切り替え + 写真ファイル選択（フォールバック）
import { h, startCamera, stopStream, captureFrame, resizeImage, toast } from './lib.js';

/**
 * @param {{facing?: 'environment'|'user', onPhoto: (blob: Blob, canvas?: HTMLCanvasElement) => void, overlay?: Node, label?: string, maxSide?: number}} opts
 */
export function cameraPanel({ facing = 'environment', onPhoto, overlay, label = '撮影', maxSide = 1280 }) {
  let stream = null;
  let mode = facing;
  const video = h('video', { playsinline: true, muted: true, autoplay: true, 'aria-label': 'カメラ映像' });
  const box = h('div', { class: 'video-box hidden' }, video, overlay || null);
  const err = h('p', { class: 'error hidden', role: 'alert' });
  const fileIn = h('input', { type: 'file', accept: 'image/*', capture: mode, class: 'hidden', 'aria-label': '写真ファイルを選ぶ' });

  const startBtn = h('button', { type: 'button', class: 'primary', onclick: () => start() }, '📷 カメラを起動');
  const shotBtn = h('button', { type: 'button', class: 'primary hidden', onclick: () => shoot() }, `● ${label}`);
  const flipBtn = h('button', { type: 'button', class: 'hidden', 'aria-label': 'カメラ切り替え', onclick: () => { mode = mode === 'user' ? 'environment' : 'user'; start(); } }, '🔄');
  const stopBtn = h('button', { type: 'button', class: 'hidden ghost', onclick: () => stop() }, '停止');
  const pickBtn = h('button', { type: 'button', onclick: () => fileIn.click() }, '🖼 写真を選ぶ');

  fileIn.addEventListener('change', async () => {
    const f = fileIn.files?.[0];
    if (!f) return;
    try { onPhoto(await resizeImage(f, maxSide)); } catch { toast('画像を読み込めませんでした'); }
    fileIn.value = '';
  });

  async function start() {
    stopStream(stream);
    err.classList.add('hidden');
    try {
      stream = await startCamera(video, { facingMode: mode });
      box.classList.remove('hidden');
      video.style.transform = mode === 'user' ? 'scaleX(-1)' : '';
      [shotBtn, flipBtn, stopBtn].forEach((b) => b.classList.remove('hidden'));
      startBtn.classList.add('hidden');
    } catch (e) {
      err.textContent = `${e.message}。「写真を選ぶ」から撮影もできます。`;
      err.classList.remove('hidden');
    }
  }
  function stop() {
    stopStream(stream); stream = null;
    box.classList.add('hidden');
    [shotBtn, flipBtn, stopBtn].forEach((b) => b.classList.add('hidden'));
    startBtn.classList.remove('hidden');
  }
  async function shoot() {
    if (!stream) return;
    const { blob, canvas } = await captureFrame(video, { maxSide });
    box.animate?.([{ opacity: 0.3 }, { opacity: 1 }], { duration: 180 });
    onPhoto(blob, canvas);
  }
  // ページを離れたらカメラを止める
  addEventListener('pagehide', stop);

  const el = h('div', { class: 'camera-panel' }, err, box, h('div', { class: 'btn-row' }, startBtn, shotBtn, flipBtn, stopBtn, pickBtn), fileIn);
  return { el, video, start, stop, get stream() { return stream; }, get mode() { return mode; } };
}

/** Blob → 一時URLの <img>（使い終わったら revoke） */
export function blobImg(blob, attrs = {}) {
  const url = URL.createObjectURL(blob);
  const img = h('img', { src: url, alt: '', ...attrs });
  img.addEventListener('load', () => setTimeout(() => URL.revokeObjectURL(url), 0), { once: true });
  return img;
}
