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
