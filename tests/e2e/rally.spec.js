// 製品版: ラリーメーカー（主催者が作る → QRを読む → 参加者がスタンプを集める）
import { test, expect } from '@playwright/test';
import jsQR from 'jsqr';
import { trackErrors } from './helpers.js';

async function makeRally(page) {
  await page.goto('/products/rally/');
  await page.getByLabel('ラリーの名前').fill('駅前ラリー');
  await page.getByLabel('ゴールしたら（景品など）').fill('事務所で画面を見せてね');
  await page.getByLabel('名前', { exact: true }).fill('時計台');
  await page.getByLabel('ヒント').fill('駅の東口');
  await page.getByRole('button', { name: '📍 いまいる場所を追加' }).click();
  await page.getByText('座標や地図のURLで追加').click();
  await page.getByLabel('名前', { exact: true }).fill('パン屋');
  await page.getByLabel('座標または地図URL').fill('35.6850, 139.767125');
  await page.getByRole('button', { name: '座標で追加' }).click();
  await expect(page.locator('.cp-list li')).toHaveCount(2);
  await page.getByRole('button', { name: '参加用のURLとQRを作る' }).click();
  await page.getByRole('button', { name: '🔳 QRを表示' }).click();
  const { w, data } = await page.locator('.qr-canvas').evaluate((c) => ({ w: c.width, data: [...c.getContext('2d').getImageData(0, 0, c.width, c.height).data] }));
  const url = jsQR(new Uint8ClampedArray(data), w, w)?.data;
  expect(url).toMatch(/\/products\/rally\/#z=/);
  await page.getByRole('button', { name: '閉じる' }).click();
  return url;
}

test('主催者が作ってQRを配り、参加者が2か所まわってコンプリート', async ({ page, context }) => {
  test.setTimeout(60000);
  const errors = trackErrors(page);
  const url = await makeRally(page);
  for (const [name, file] of [['🖨 ポスター（A4）', 'rally-poster.png'], ['🪧 チェックポイント看板', 'rally-checkpoints.png']]) {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name }).click()]);
    expect(dl.suggestedFilename()).toBe(file);
  }
  // 参加者
  await page.goto(url);
  await expect(page.getByRole('heading', { name: '駅前ラリー' })).toBeVisible();
  await expect(page.getByText('ヒント: 駅の東口')).toBeVisible();
  await page.getByRole('button', { name: '📍 スタンプを押す' }).click();
  await expect(page.locator('.count')).toHaveText('1 / 2');
  // すぐ移動して押すと「速すぎ」
  await context.setGeolocation({ latitude: 35.6850, longitude: 139.767125, accuracy: 10 });
  await page.getByRole('button', { name: '📍 スタンプを押す' }).click();
  await expect(page.getByText(/速すぎます/)).toBeVisible();
  // 5分後にしたことにする（直前のスタンプ時刻を書き換え）
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('happy:rally:st:')) { const v = JSON.parse(localStorage.getItem(k)); v[0].t -= 300000; localStorage.setItem(k, JSON.stringify(v)); } });
  await page.reload();
  await page.getByRole('button', { name: '🧭 次のポイントへ案内' }).click();
  await expect(page.locator('.compass-dist')).toHaveText(/\d+ m/);
  await page.getByRole('button', { name: '📍 スタンプを押す' }).click();
  await expect(page.getByRole('heading', { name: 'COMPLETE!' })).toBeVisible();
  const t1 = await page.locator('.live-clock').textContent();
  await page.waitForTimeout(1200);
  expect(await page.locator('.live-clock').textContent()).not.toBe(t1); // 時計が動いている
  await expect(page.getByText('🎁 事務所で画面を見せてね')).toBeVisible();
  expect(errors).toEqual([]);
});

test('プレビューではスタンプが保存されない', async ({ page }) => {
  await makeRally(page);
  await page.getByRole('button', { name: '👀 参加者の画面を試す' }).click();
  await expect(page.getByText('プレビュー中')).toBeVisible();
  await page.getByRole('button', { name: '📍 スタンプを押す' }).click();
  await expect(page.locator('.count')).toHaveText('1 / 2');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('happy:rally:st:')).length)).toBe(0);
});

test('壊れたURLはエラー・期間前は押せない', async ({ page }) => {
  await page.goto('/products/rally/#z=broken!!');
  await expect(page.getByText('ラリーのURLが壊れているか')).toBeVisible();
  await page.goto('/products/rally/');
  await page.getByLabel('開始日').fill('2099-01-01');
  await page.getByLabel('名前', { exact: true }).fill('A');
  await page.getByRole('button', { name: '📍 いまいる場所を追加' }).click();
  await page.getByRole('button', { name: '参加用のURLとQRを作る' }).click();
  await page.getByRole('button', { name: '👀 参加者の画面を試す' }).click();
  await expect(page.getByText(/まだ始まっていません/)).toBeVisible();
  await expect(page.getByRole('button', { name: '📍 スタンプを押す' })).toBeDisabled();
});
