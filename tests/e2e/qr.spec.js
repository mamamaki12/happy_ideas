// QRコード: 画面に出したQRを実際に読み取り、正しいURLになっているか確認
import { test, expect } from '@playwright/test';
import jsQR from 'jsqr';
import { openApp, gotoFresh, readQr as readQrRaw } from './helpers.js';

const readQr = (page) => readQrRaw(page, jsQR);

test('スタンプラリー: QR → 読み取ると同じラリーが開く・ポスター・修了証', async ({ page }) => {
  await openApp(page, 'stamp-rally');
  await page.getByLabel('ラリーの名前').fill('駅前ラリー');
  await page.getByLabel('名前', { exact: true }).fill('時計台');
  await page.getByRole('button', { name: '📍 いまいる場所を追加' }).click();
  await page.getByRole('button', { name: '🔳 QRを表示' }).click();
  const url = await readQr(page);
  expect(url).toMatch(/\/apps\/stamp-rally\/#r=/);
  await page.getByRole('button', { name: '閉じる' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '🖨 ポスターを作る' }).click()]);
  expect(dl.suggestedFilename()).toBe('stamp-rally-poster.png');
  await gotoFresh(page, url);
  await expect(page.getByRole('heading', { name: '駅前ラリー' })).toBeVisible();
  await page.getByRole('button', { name: '㊞ スタンプを押す' }).click();
  const [cert] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '🏅 修了証を作る' }).click()]);
  expect(cert.suggestedFilename()).toBe('stamp-rally-complete.png');
});

test('トイレマップ: 店頭掲示用QRが読み取れる', async ({ page }) => {
  await openApp(page, 'spot-share');
  await page.getByRole('button', { name: '📍 登録' }).click();
  await page.getByRole('button', { name: /QRを表示/ }).click();
  expect(await readQr(page)).toMatch(/#p=/);
});

test('家族の予定・ほしいものリスト: QRが読み取れる', async ({ page }) => {
  await openApp(page, 'family-schedule');
  await page.getByLabel('内容').fill('運動会');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await page.getByRole('button', { name: '🔳 QR' }).click();
  expect(await readQr(page)).toMatch(/#s=/);
  await openApp(page, 'wishlist');
  await page.getByLabel('名前', { exact: true }).fill('本');
  await page.getByRole('button', { name: '追加' }).click();
  await page.getByRole('button', { name: '🔳 QRで見せる' }).click();
  expect(await readQr(page)).toMatch(/#w=/);
});
