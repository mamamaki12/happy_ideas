// アクセシビリティ: 全ページを axe-core で検査（重大・深刻な違反がないこと）
import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { BUILT } from '../../ideas/built.js';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
test.use({ bypassCSP: true }); // 検査スクリプトを注入するためだけに CSP を外す（アプリ自体の CSP は smoke/xss テストで確認済み）

const PAGES = ['index.html', ...BUILT.map((s) => `apps/${s}/`), 'products/oshi-techo/', 'products/rally/', 'products/photo-editor/', 'products/privacy.html'];

async function axeSerious(page) {
  await page.addScriptTag({ path: axePath });
  const res = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  }));
  return res.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} [${(n.any[0]?.data?.contrastRatio ?? '')} ${n.any[0]?.data?.fgColor ?? ''}/${n.any[0]?.data?.bgColor ?? ''}]`).join(' | ')}`);
}

// 暮らしのアプリ6つとモトログ: 記録があり、バックアップのすすめと「元に戻す」が出ている状態で検査する
for (const slug of ['home-finder', 'gap-time', 'cooldown-cart', 'life-manual', 'chore-meter', 'refill-forecast', 'use-value']) {
  test(`a11y: products/${slug}/（記録・バックアップのすすめ・元に戻す）`, async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto(`/products/${slug}/`);
    await page.locator('#demo').click();
    if (slug !== 'use-value') await page.locator('#demo').click();
    await expect(page.locator('#backup-reminder button').first()).toBeVisible();
    await page.locator('article').first().getByRole('button', { name: '削除', exact: true }).click();
    await expect(page.getByRole('button', { name: '元に戻す' })).toBeVisible();
    const serious = await axeSerious(page);
    expect(serious, serious.join('\n')).toEqual([]);
  });
}

test('a11y: products/oshi-techo/ のホーム（記録・バックアップのすすめ）', async ({ page }) => {
  await page.goto('/products/oshi-techo/');
  await page.evaluate(() => {
    const set = (k, v) => localStorage.setItem(`happy:oshi-techo:${k}`, JSON.stringify(v));
    set('oshis', [{ id: 'a', name: 'ミナ', color: '#ff5fa2', emoji: '💖', since: '' }]);
    set('entries', [1, 2, 3, 4, 5].map((n) => ({ id: `e${n}`, oshi: 'a', type: 'spend', kind: '🛍 グッズ', amount: 1000, title: `グッズ${n}`, venue: '', date: `2026-10-0${n}`, memo: '' })));
  });
  await page.reload();
  await expect(page.getByRole('region', { name: 'バックアップのおすすめ' })).toBeVisible();
  const serious = await axeSerious(page);
  expect(serious, serious.join('\n')).toEqual([]);
});

for (const path of PAGES) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.route('https://api.open-meteo.com/**', (r) => r.abort());
    await page.goto(`/${path}`);
    await page.waitForTimeout(300);
    await page.addScriptTag({ path: axePath });
    const res = await page.evaluate(async () => window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    }));
    const serious = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
      .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} [${(n.any[0]?.data?.contrastRatio ?? '')} ${n.any[0]?.data?.fgColor ?? ''}/${n.any[0]?.data?.bgColor ?? ''}]`).join(' | ')}`);
    expect(serious, serious.join('\n')).toEqual([]);
  });
}
