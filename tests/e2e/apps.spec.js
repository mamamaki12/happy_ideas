// 主要アプリの操作テスト（偽カメラ・偽マイク・位置情報は東京駅）
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

test.describe('生活・お金', () => {
  test('冷蔵庫番: 追加 → 食べた で食べきり率が出る', async ({ page }) => {
    const errors = await openApp(page, 'fridge-keeper');
    await page.getByLabel('名前').fill('牛乳');
    await page.getByRole('button', { name: '+1日' }).click();
    await page.getByRole('button', { name: '追加する' }).click();
    await expect(page.getByText('冷蔵庫の中（1品）')).toBeVisible();
    await expect(page.getByText('あと1日')).toBeVisible();
    await page.getByRole('button', { name: '牛乳を食べた' }).click();
    await expect(page.getByText('100%')).toBeVisible();
    // リロードしても残る
    await page.reload();
    await expect(page.getByText('100%')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('値段おぼえ帳: 2回記録すると最安値と前回比が出る', async ({ page }) => {
    await openApp(page, 'price-memo');
    await page.getByLabel('商品', { exact: true }).fill('卵');
    await page.getByLabel('お店').fill('A店');
    await page.getByLabel('値段（円）').fill('250');
    await page.getByRole('button', { name: '記録する' }).click();
    await page.getByLabel('値段（円）').fill('298');
    await expect(page.getByText(/前回より \+48円/)).toBeVisible();
    await page.getByRole('button', { name: '記録する' }).click();
    await expect(page.getByText(/最安 250円（A店）/)).toBeVisible();
  });

  test('割り勘: 合計を入れると1人あたりが出る', async ({ page }) => {
    await openApp(page, 'split-bill');
    await page.getByLabel('合計金額（円）').fill('9000');
    await expect(page.locator('.list li').filter({ hasText: '幹事' }).last()).toContainText('3,000円');
  });

  test('単価くらべ: 安い方に王冠', async ({ page }) => {
    await openApp(page, 'unit-price');
    await page.locator('#price0').fill('398'); await page.locator('#count0').fill('3');
    await page.locator('#price1').fill('598'); await page.locator('#count1').fill('5');
    await expect(page.locator('.card.best')).toContainText('候補 B');
  });

  test('サブスク棚卸し: 追加すると年額が出る', async ({ page }) => {
    await openApp(page, 'sub-audit');
    await page.getByLabel('サービス名').fill('動画');
    await page.getByLabel('金額').fill('1000');
    await page.getByRole('button', { name: '追加' }).click();
    await expect(page.locator('.stat').nth(1)).toContainText('12,000円');
  });

  test('がまん貯金箱: ボタンで貯まる', async ({ page }) => {
    await openApp(page, 'gaman-bank');
    await page.getByRole('button', { name: /コーヒー/ }).click();
    await expect(page.locator('.big-number')).toHaveText('450円');
  });

  test('ゴミの日: 種類を追加できる', async ({ page }) => {
    await openApp(page, 'trash-day');
    await page.getByLabel('名前').fill('古紙');
    await page.locator('label.pill', { hasText: '土' }).click();
    await page.getByRole('button', { name: '追加' }).click();
    await expect(page.getByText('毎週 土曜')).toBeVisible();
  });
});

test.describe('カメラ系（偽カメラ）', () => {
  test('レシート家計簿: 撮影 → 金額入力 → 月合計', async ({ page }) => {
    const errors = await openApp(page, 'receipt-snap');
    await page.getByRole('button', { name: '📷 カメラを起動' }).click();
    await page.getByRole('button', { name: '● レシートを撮る' }).click();
    await expect(page.locator('.receipt-img')).toBeVisible();
    await page.getByLabel('金額（円）').fill('1280');
    await page.getByRole('button', { name: '記録する' }).click();
    await expect(page.locator('.big-number')).toHaveText('1,280円');
    await expect(page.locator('img.thumb')).toHaveCount(1); // IndexedDB から写真が戻る
    expect(errors).toEqual([]);
  });

  test('食事写真ログ: 撮るとカレンダーに点が付く', async ({ page }) => {
    await openApp(page, 'meal-photo');
    await page.getByRole('button', { name: '📷 カメラを起動' }).click();
    await page.getByRole('button', { name: '● 食事を撮る' }).click();
    await expect(page.locator('.meal img')).toHaveCount(1);
    await expect(page.locator('.cal-cell.today .dots')).toHaveText('●');
  });

  test('空の色: 撮ると色見本ができる', async ({ page }) => {
    await openApp(page, 'sky-color');
    await page.getByRole('button', { name: '📷 カメラを起動' }).click();
    await page.getByRole('button', { name: '● 空を撮る' }).click();
    await expect(page.locator('.sky-chip')).toHaveCount(1);
  });

  test('書類スキャン: 撮るとページが増える', async ({ page }) => {
    await openApp(page, 'doc-scan');
    await page.getByRole('button', { name: '📷 カメラを起動' }).click();
    await page.getByRole('button', { name: '● ページを撮る' }).click();
    await expect(page.locator('canvas.page')).toHaveCount(1);
  });

  test('推しカメラ: 撮影すると合成画像と保存ボタンが出る', async ({ page }) => {
    await openApp(page, 'oshi-camera');
    await page.getByRole('button', { name: '📸 撮る' }).click();
    await expect(page.locator('img.shot')).toBeVisible();
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible();
  });

  test('持ち物台帳: 登録してCSV書き出し', async ({ page }) => {
    await openApp(page, 'belongings');
    await page.getByLabel('名前').fill('=冷蔵庫'); // CSVインジェクション対策の確認
    await page.getByLabel('購入価格').fill('80000');
    await page.getByRole('button', { name: '登録' }).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSVで書き出す' }).click()]);
    const csv = await (await dl.createReadStream()).toArray();
    const text = Buffer.concat(csv).toString('utf8');
    expect(text).toContain("'=冷蔵庫");
  });

  test('いまの瞬間: 練習撮影で1枚増える', async ({ page }) => {
    await openApp(page, 'moment-cam');
    await page.getByRole('button', { name: '今すぐ撮る（練習）' }).click();
    await expect(page.locator('.moment-grid img')).toHaveCount(1, { timeout: 15000 });
  });
});

test.describe('位置情報（東京駅に固定）', () => {
  test('駐車位置ピン: 保存すると距離が出る', async ({ page }) => {
    await openApp(page, 'parking-pin');
    await page.getByRole('button', { name: '📍 ここに停めた' }).click();
    await expect(page.locator('.compass-dist')).toHaveText(/\d+ m/);
    await page.getByLabel('メモ').fill('B2 青23');
    await page.reload();
    await expect(page.getByLabel('メモ')).toHaveValue('B2 青23');
  });
});
