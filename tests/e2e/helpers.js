import { expect } from '@playwright/test';

/** ページのエラー（未捕捉例外・console.error・CSP違反）を集める */
export function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // 外部APIへの接続失敗（テスト環境はオフライン）は除外
    if (/api\.open-meteo\.com|net::ERR_|Failed to load resource/.test(t)) return;
    errors.push(`console: ${t}`);
  });
  return errors;
}

export async function openApp(page, slug) {
  const errors = trackErrors(page);
  await page.goto(`/apps/${slug}/`);
  await expect(page.locator('h1')).toBeVisible();
  // app.js が何かを描画したこと（リード文 + noscript 以外の要素が増える）
  await expect.poll(async () => page.locator('#app > *').count()).toBeGreaterThan(2);
  return errors;
}

/** ハッシュだけ違う同じページへ移動すると、アプリ側の再読み込みと競合するので、いったん空ページを挟む */
export async function gotoFresh(page, url) {
  await page.goto('about:blank');
  await page.goto(url);
}

/** 画面のQRコード（.qr-canvas）を読み取る。縮小してからピクセルを転送するので速い */
export async function readQr(page, jsQR, selector = '.qr-canvas') {
  const { w, b64 } = await page.locator(selector).evaluate((c) => {
    const n = Math.min(c.width, 360); const t = document.createElement('canvas'); t.width = n; t.height = n;
    const x = t.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data; let s = '';
    for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode(...d.subarray(i, i + 0x8000));
    return { w: n, b64: btoa(s) };
  });
  return jsQR(new Uint8ClampedArray(Buffer.from(b64, 'base64')), w, w)?.data ?? null;
}
