// 製品版: 推し活手帳
import { test, expect } from '@playwright/test';
import { trackErrors } from './helpers.js';

async function onboard(page, name = 'ミナ', shown = name) {
  await page.goto('/products/oshi-techo/');
  await page.getByLabel('推しの名前').fill(name);
  await page.getByLabel('推しはじめた日（任意）').fill('2024-04-01');
  await page.getByRole('button', { name: 'はじめる' }).click();
  await expect(page.locator('.hero-name')).toContainText(shown);
}

test('はじめての設定 → 支出と予定を記録 → ホームに反映', async ({ page }) => {
  const errors = trackErrors(page);
  await onboard(page);
  await expect(page.getByText(/推して [\d,]+ 日目/)).toBeVisible();
  await page.getByRole('button', { name: '💸 支出を記録' }).click();
  await page.getByRole('button', { name: '+5,000' }).click();
  await page.getByRole('button', { name: '+3,000' }).click();
  await page.getByLabel('メモ').fill('アクスタ');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.locator('.month-total')).toHaveText('8,000円');
  await page.getByRole('button', { name: '📅 予定を追加' }).click();
  await page.getByLabel('予定', { exact: true }).fill('東京公演');
  await page.getByLabel('会場').fill('東京ドーム');
  // 日付はブラウザのタイムゾーン（Asia/Tokyo）で計算する
  const target = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  await page.getByLabel('日付').fill(target);
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.locator('.hero-days')).toHaveText('あと12日');
  await page.reload();
  await expect(page.locator('.hero-days')).toHaveText('あと12日');
  expect(errors).toEqual([]);
});

test('タブ移動: 記録・まとめ・設定・カメラ', async ({ page }) => {
  const errors = trackErrors(page);
  await onboard(page);
  await page.getByRole('button', { name: '💸 支出を記録' }).click();
  await page.getByLabel('金額').fill('12000');
  await page.getByRole('button', { name: '保存' }).click();
  await page.getByRole('link', { name: '記録' }).click();
  await expect(page.locator('.card h2').first()).toContainText('月');
  await page.getByRole('link', { name: 'まとめ' }).click();
  await expect(page.locator('canvas.wrap-canvas')).toBeVisible();
  await page.getByRole('link', { name: 'カメラ' }).click();
  await page.getByRole('button', { name: '📸 撮る' }).click();
  await expect(page.locator('img.shot')).toBeVisible();
  await page.getByRole('link', { name: '設定' }).click();
  await expect(page.getByRole('heading', { name: 'バックアップ' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('複数の推し: 追加して切り替えるとテーマ色が変わる', async ({ page }) => {
  await onboard(page);
  await page.getByRole('link', { name: '設定' }).click();
  await page.getByLabel('追加する推しの名前').fill('レン');
  await page.getByLabel('追加する推しの色').fill('#3366ff');
  await page.getByRole('button', { name: '追加' }).click();
  await page.getByRole('link', { name: 'ホーム' }).click();
  await page.getByRole('tab', { name: /レン/ }).click();
  await expect(page.locator('.hero-name')).toContainText('レン');
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--oshi'))).toBe('#3366ff');
});

test('バックアップ: 書き出し → 消去 → 読み込みで復元', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await onboard(page, 'サク');
  await page.getByRole('button', { name: '💸 支出を記録' }).click();
  await page.getByLabel('金額').fill('4500');
  await page.getByRole('button', { name: '保存' }).click();
  await page.getByRole('link', { name: '設定' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '📤 書き出す' }).click()]);
  const buf = Buffer.concat(await (await dl.createReadStream()).toArray());
  await page.evaluate(() => localStorage.clear());
  await page.goto('/products/oshi-techo/');
  await expect(page.getByRole('heading', { name: '推し活手帳へようこそ' })).toBeVisible();
  await page.getByLabel('推しの名前').fill('仮'); await page.getByRole('button', { name: 'はじめる' }).click();
  await page.getByRole('link', { name: '設定' }).click();
  await page.getByLabel('バックアップを読み込む').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: buf });
  await expect(page.locator('.hero-name')).toContainText('サク');
  await expect(page.locator('.month-total')).toHaveText('4,500円');
});

test('XSS: 推しの名前やメモにHTMLを入れても実行されない', async ({ page }) => {
  await onboard(page, '<img src=x onerror="window.__x=1">', '<img src=x'); // 名前は30文字で切られる
  await page.getByRole('button', { name: '💸 支出を記録' }).click();
  await page.getByLabel('金額').fill('100');
  await page.getByLabel('メモ').fill('<script>window.__x=1</script>');
  await page.getByRole('button', { name: '保存' }).click();
  await page.getByRole('link', { name: 'まとめ' }).click();
  expect(await page.evaluate(() => window.__x)).toBeUndefined();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
});

test('当落管理: 申込 → 当選（入金期限）→ ホームに警告 → 入金で支出と予定に自動追加', async ({ page }) => {
  const errors = trackErrors(page);
  await onboard(page);
  await page.getByRole('link', { name: '当落' }).click();
  await page.getByRole('button', { name: '＋ 申し込んだチケットを記録' }).click();
  await page.getByLabel('公演・申込名').fill('大阪公演 FC先行');
  await page.getByLabel('金額（1枚・手数料込み）').fill('11000');
  await page.getByLabel('会場').fill('京セラドーム');
  const day = (n) => page.evaluate((k) => { const d = new Date(); d.setDate(d.getDate() + k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }, n);
  await page.getByLabel('公演日').fill(await day(30));
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('heading', { name: '⏳ 結果待ち' })).toBeVisible();
  await page.getByLabel('大阪公演 FC先行の入金期限').fill(await day(1));
  await page.getByRole('button', { name: '🎉 当選' }).click();
  await expect(page.getByText('あと1日')).toBeVisible();
  await page.getByRole('link', { name: 'ホーム' }).click();
  await expect(page.locator('.alert')).toContainText('入金期限まであと1日');
  await page.locator('.alert').click();
  await page.getByRole('button', { name: '💳 入金した' }).click();
  await expect(page.getByRole('heading', { name: '✅ 入金済み' })).toBeVisible();
  await page.getByRole('link', { name: 'ホーム' }).click();
  await expect(page.locator('.month-total')).toHaveText('11,000円');
  await expect(page.locator('.hero-days')).toHaveText('あと30日');
  await page.getByRole('link', { name: '設定' }).click();
  await expect(page.getByRole('heading', { name: 'バックアップ' })).toBeVisible();
  expect(errors).toEqual([]);
});
