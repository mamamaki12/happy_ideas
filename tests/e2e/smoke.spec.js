// すべての試作アプリ: 開ける・エラーが出ない・横スクロールしない・基本的なアクセシビリティ
import { test, expect } from '@playwright/test';
import { BUILT } from '../../ideas/built.js';
import { openApp, trackErrors } from './helpers.js';

test('ギャラリーに100件のアイデアが表示され、試作へのリンクが動く', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/index.html');
  await expect(page.locator('.idea')).toHaveCount(100);
  await expect(page.locator('.idea.built')).toHaveCount(BUILT.length);
  await page.getByLabel('キーワードで探す').fill('推し');
  expect(await page.locator('.idea').count()).toBeGreaterThan(0);
  expect(await page.locator('.idea').count()).toBeLessThan(100);
  expect(errors).toEqual([]);
});

for (const slug of BUILT) {
  test(`${slug}: 起動してエラーが出ない`, async ({ page }) => {
    const errors = await openApp(page, slug);
    await page.waitForTimeout(300);
    // スマホ幅で横スクロールが出ない
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, '横スクロールが発生している').toBeLessThanOrEqual(1);
    // ラベルのない入力欄がない
    const unlabeled = await page.evaluate(() => [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea')]
      .filter((el) => !(el.labels?.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
      .map((el) => el.outerHTML.slice(0, 80)));
    expect(unlabeled, 'ラベルのない入力欄').toEqual([]);
    // 名前のないボタンがない
    const nameless = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label')).length);
    expect(nameless, '名前のないボタン').toBe(0);
    // null / undefined / NaN がそのまま表示されていない
    const text = await page.locator('body').innerText();
    expect(text, '表示に null/undefined/NaN が混ざっている').not.toMatch(/(^|[^a-zA-Z])(null|undefined|NaN)([^a-zA-Z]|$)/);
    expect(errors).toEqual([]);
  });
}
