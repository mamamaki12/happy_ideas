// アクセシビリティ: 全ページを axe-core で検査（重大・深刻な違反がないこと）
import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { BUILT } from '../../ideas/built.js';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
test.use({ bypassCSP: true }); // 検査スクリプトを注入するためだけに CSP を外す（アプリ自体の CSP は smoke/xss テストで確認済み）

const PAGES = ['index.html', ...BUILT.map((s) => `apps/${s}/`), 'products/oshi-techo/', 'products/rally/', 'products/photo-editor/', 'products/hoyo/', 'products/ponpon/', 'products/kuhiroba/', 'products/privacy.html'];

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

test('a11y: products/hoyo/（故人・バックアップのすすめ・準備の画面）', async ({ page }) => {
  await page.goto('/products/hoyo/');
  await page.evaluate(() => localStorage.setItem('happy-ideas-hoyo-v1', JSON.stringify({ version: 1, people: [{ id: 'a', name: '山田 一郎', kaimyo: '', relation: '父', death: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10), kansai: false, memo: 'メモ' }], events: {} })));
  await page.reload();
  await expect(page.locator('#backup-reminder button').first()).toBeVisible();
  expect(await axeSerious(page)).toEqual([]);
  await page.locator('#upcoming article').filter({ hasText: '四十九日' }).getByRole('button', { name: '準備を開く' }).click();
  const serious = await axeSerious(page);
  expect(serious, serious.join('\n')).toEqual([]);
});

test('a11y: products/ponpon/（記録・カレンダー・まとめ・入力画面）', async ({ page }) => {
  await page.goto('/products/ponpon/');
  await page.evaluate(() => {
    const d = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    const logs = Array.from({ length: 12 }, (_, i) => ({ id: `l${i}`, kid: 'k', type: i % 3 ? 'poo' : 'med', at: `${d(i + 1)}T08:00`, ...(i % 3 ? { bristol: (i % 7) + 1, sticker: i % 10, pain: i === 2 } : { med: '酸化マグネシウム', dose: '1包' }) }));
    localStorage.setItem('happy-ideas-ponpon-v1', JSON.stringify({ version: 1, kids: [{ id: 'k', name: 'はる', emoji: '🐻' }, { id: 'k2', name: 'なつ', emoji: '🐰' }], logs }));
  });
  await page.reload();
  await expect(page.locator('#backup-reminder button').first()).toBeVisible();
  await page.getByRole('button', { name: '2週間分を作る' }).click();
  expect(await axeSerious(page)).toEqual([]);
  await page.getByRole('button', { name: 'うんち出た', exact: true }).click();
  const serious = await axeSerious(page);
  expect(serious, serious.join('\n')).toEqual([]);
});

test('a11y: products/kuhiroba/（広場・句帳・バックアップのすすめ・よむ画面）', async ({ page }) => {
  await page.route('**/api/haiku**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ posts: [{ id: 'f'.repeat(32), text: '柿食へば 鐘が鳴るなり 法隆寺', kigo: '柿', name: '子規', photo: false, likes: 3, created: Date.now() }], next: 'x' }) }));
  await page.goto('/products/kuhiroba/');
  await page.evaluate(() => localStorage.setItem('happy-ideas-kuhiroba-v1', JSON.stringify({ version: 1, entries: [1, 2, 3, 4, 5].map((n) => ({ id: `e${n}`, text: `ためしの句 その${n}です よろしくね`, yomi: '', kigo: '', date: '2026-11-0' + n, memo: n === 1 ? 'メモ' : '', photo: '' })) })));
  await page.reload();
  await expect(page.locator('#plaza article')).toHaveCount(1);
  await expect(page.locator('#backup-reminder button').first()).toBeVisible();
  expect(await axeSerious(page)).toEqual([]);
  await page.getByRole('button', { name: '＋ 一句よむ' }).click();
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
