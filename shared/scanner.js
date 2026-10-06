// バーコード／QRスキャナー（BarcodeDetector API）。
// iOS Safari など非対応環境では supported=false になるので、呼び出し側で手入力に切り替える。
import { h, startCamera, stopStream, vibrate } from './lib.js';

export const barcodeSupported = () => 'BarcodeDetector' in window;

/**
 * 全画面のスキャナーを開き、読み取った値を返す（キャンセル時は null）。
 * @param {{formats?: string[], title?: string}} opts
 */
export async function scanBarcode({ formats, title = 'バーコードを枠に入れてください' } = {}) {
  if (!barcodeSupported()) throw new Error('このブラウザはバーコード読み取りに対応していません（Chrome/Android推奨）。手入力してください。');
  const supported = await window.BarcodeDetector.getSupportedFormats();
  const use = formats ? formats.filter((f) => supported.includes(f)) : supported;
  const detector = new window.BarcodeDetector(use.length ? { formats: use } : undefined);

  return new Promise((resolve, reject) => {
    let stream; let raf; let done = false;
    const video = h('video', { playsinline: true, muted: true, 'aria-label': 'カメラ映像' });
    const close = (val) => {
      if (done) return; done = true;
      cancelAnimationFrame(raf); stopStream(stream); overlay.remove();
      resolve(val);
    };
    const overlay = h('div', { class: 'scanner-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'スキャナー' },
      h('p', { class: 'scanner-title' }, title),
      h('div', { class: 'scanner-frame' }, video, h('div', { class: 'scanner-box' })),
      h('button', { type: 'button', class: 'big', onclick: () => close(null) }, 'キャンセル'));
    document.body.append(overlay);

    startCamera(video).then((s) => {
      stream = s;
      let last = 0;
      const tick = async (t) => {
        if (done) return;
        if (t - last > 200 && video.readyState >= 2) {
          last = t;
          try {
            const codes = await detector.detect(video);
            if (codes.length) { vibrate(80); close(codes[0].rawValue); return; }
          } catch { /* フレーム未準備などは無視 */ }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }).catch((e) => { overlay.remove(); done = true; reject(e); });
  });
}
