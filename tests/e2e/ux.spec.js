// UI/UX 改善の確認
import { test, expect } from '@playwright/test';
import { openApp, trackErrors } from './helpers.js';

test('ギャラリー: おすすめと最近ひらいたが出る', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: 'まず試してほしい' })).toBeVisible();
  await page.locator('.mini', { hasText: '熱中症ガード' }).click();
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: '最近ひらいた' })).toBeVisible();
  await page.getByText('機能・実現性で絞り込む').click();
  await page.getByRole('button', { name: /^C: / }).click();
  await expect(page.locator('.idea')).toHaveCount(7);
  expect(errors).toEqual([]);
});

test('フッター: このアプリのデータを消す', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await openApp(page, 'gaman-bank');
  await page.getByRole('button', { name: /コーヒー/ }).click();
  await expect(page.locator('.big-number')).toHaveText('450円');
  await page.getByText('このアプリについて').click();
  await expect(page.getByText(/実現性 A/)).toBeVisible();
  await page.getByRole('button', { name: 'このアプリのデータを消す' }).click();
  await expect(page.locator('.big-number')).toHaveText('0円');
});

test('フッター: 写真（IndexedDB）も消える', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await openApp(page, 'meal-photo');
  await page.getByRole('button', { name: '📷 カメラを起動' }).click();
  await page.getByRole('button', { name: '● 食事を撮る' }).click();
  await expect(page.locator('.meal img')).toHaveCount(1);
  await page.getByText('このアプリについて').click();
  await page.getByRole('button', { name: 'このアプリのデータを消す' }).click();
  await expect(page.locator('.meal')).toHaveCount(0);
});

test('育児記録: ミルクは量ボタンで記録', async ({ page }) => {
  await openApp(page, 'baby-log');
  await page.getByRole('button', { name: '🍼 ミルク' }).click();
  await page.getByRole('button', { name: '120ml' }).click();
  await expect(page.getByText(/ミルク 1回（120ml）/)).toBeVisible();
});

test('ペット手帳: ダイアログなしでペットを追加', async ({ page }) => {
  await openApp(page, 'pet-log');
  await page.getByRole('button', { name: '＋ 追加' }).click();
  await page.getByLabel('新しいペットの名前').fill('タマ');
  await page.getByLabel('新しいペットの種類').selectOption('🐱');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await expect(page.getByRole('heading', { name: /🐱 タマ の体重/ })).toBeVisible();
});

test('おてつだい: ダイアログなしで子どもを追加', async ({ page }) => {
  await openApp(page, 'chore-points');
  await page.getByRole('button', { name: '子どもを追加' }).click();
  await page.getByLabel('子どものなまえ').fill('はなこ');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await expect(page.getByRole('tab', { name: /はなこ/ })).toHaveAttribute('aria-selected', 'true');
});

test('出かける前チェック: 項目の追加・削除がその場で反映', async ({ page }) => {
  await openApp(page, 'leave-check');
  await page.getByText('項目を編集').click();
  await page.getByLabel('追加').fill('エアコン');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await expect(page.locator('.check-item', { hasText: 'エアコン' })).toBeVisible();
  await page.getByRole('button', { name: 'エアコンを削除' }).click();
  await expect(page.locator('.check-item', { hasText: 'エアコン' })).toHaveCount(0);
});

test('熱中症ガード: オフライン時は通知を出さない', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (route) => route.abort());
  await openApp(page, 'heat-guard');
  await expect(page.getByText(/予報を取得できませんでした/)).toBeVisible();
  await expect(page.locator('.toast', { hasText: '暑さ指数' })).toHaveCount(0);
});

test('保存した文章（textarea）がリロード後も表示される', async ({ page }) => {
  await openApp(page, 'setlist');
  await page.getByLabel('新しいライブ').fill('ツアー');
  await page.getByRole('button', { name: '作成' }).click();
  await page.getByLabel('🔮 予想').fill('曲A\n曲B');
  await page.reload();
  await expect(page.getByLabel('🔮 予想')).toHaveValue('曲A\n曲B');
});

test('select の初期値（保存した設定）が反映される', async ({ page }) => {
  await openApp(page, 'phrase-board');
  await page.getByLabel('相手').selectOption('ko');
  await page.reload();
  await expect(page.getByLabel('相手')).toHaveValue('ko');
});

test.describe('iPhone の Safari', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  test('推し活手帳: ホーム画面に追加の案内が出て、閉じると二度と出ない', async ({ page }) => {
    await page.goto('/products/oshi-techo/');
    await expect(page.getByText('推し活手帳をホーム画面に追加')).toBeVisible();
    await expect(page.getByText(/共有ボタン/)).toBeVisible();
    await page.getByRole('button', { name: '閉じる' }).click();
    await page.reload();
    await expect(page.getByText('推し活手帳をホーム画面に追加')).toHaveCount(0);
  });
});
