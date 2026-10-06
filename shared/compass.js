// 目的地への方角を矢印で示す部品。コンパスが使えない端末では「北東へ」のように文字で示す。
import { h, requestOrientation, watchHeading, getPosition, distance, bearing, fmtDistance, geoErrorText } from './lib.js';

const DIRS = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
export const dirName = (deg) => DIRS[Math.round(deg / 45) % 8];

/**
 * @param {{lat:number, lon:number}} target
 * @returns {{el: HTMLElement, start: () => Promise<void>, stop: () => void}}
 */
export function compassTo(target, { onUpdate } = {}) {
  const arrow = h('div', { class: 'compass-arrow', 'aria-hidden': 'true' }, '➤');
  const dial = h('div', { class: 'compass-dial' }, h('span', { class: 'compass-n', 'aria-hidden': 'true' }, 'N'), arrow);
  const dist = h('p', { class: 'big-number compass-dist' }, '--');
  const info = h('p', { class: 'center muted', 'aria-live': 'polite' }, '位置を確認中…');
  const enable = h('button', { type: 'button', class: 'small hidden' }, '🧭 コンパスを使う');
  let watchId = null; let stopHeading = null; let heading = null; let here = null;

  const update = () => {
    if (!here) return;
    const d = distance(here, target); const b = bearing(here, target);
    dist.textContent = fmtDistance(d);
    const rel = heading == null ? b : (b - heading + 360) % 360;
    // ➤ は右向きなので -90° 補正
    arrow.style.transform = `rotate(${rel - 90}deg)`;
    dial.classList.toggle('no-heading', heading == null);
    info.textContent = heading == null ? `${dirName(b)}の方角（北が上）・精度 ±${Math.round(here.acc)}m` : `${dirName(b)}の方角・矢印の方向へ`;
    onUpdate?.({ distance: d, bearing: b });
  };

  async function startHeading() {
    if (!(await requestOrientation())) return;
    enable.classList.add('hidden');
    stopHeading = watchHeading((v) => { heading = v; update(); });
  }
  enable.addEventListener('click', startHeading);

  return {
    el: h('div', { class: 'compass' }, dial, dist, info, h('div', { class: 'center' }, enable)),
    async start() {
      // iOS は許可ボタンが必要。それ以外はそのまま開始
      if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') enable.classList.remove('hidden');
      else startHeading();
      try { const p = await getPosition(); here = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }; update(); } catch (e) { info.textContent = e.message; }
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition((p) => { here = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }; update(); },
          (e) => { info.textContent = geoErrorText(e); }, { enableHighAccuracy: true, maximumAge: 2000 });
      }
    },
    stop() { if (watchId != null) navigator.geolocation.clearWatch(watchId); stopHeading?.(); },
  };
}
