// 色のコントラスト計算（WCAG 2.x）。利用者が選んだ色（推し色など）でも文字が読めるようにする。
export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(a, b) { const x = luminance(a); const y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
/** 背景色に対して読みやすい文字色（白か黒） */
export const inkFor = (bg) => (contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111');
/** 背景色が濃すぎる・薄すぎるとき、白文字で 4.5:1 を満たすまで暗くした色 */
export function darkenFor(hex, against = '#f7f6f2', ratio = 4.5) { // 既定はページの背景色（白より少し暗い）
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const toHex = () => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  for (let i = 0; i < 40 && contrast(toHex(), against) < ratio; i++) { r *= 0.92; g *= 0.92; b *= 0.92; }
  return toHex();
}
