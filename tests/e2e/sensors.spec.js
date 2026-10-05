// センサー・位置情報・外部APIを使うアプリの操作テスト
import { test, expect } from '@playwright/test';
import { openApp, gotoFresh } from './helpers.js';

const orient = (page, beta, gamma = 0, alpha = 0) => page.evaluate(([b, g, a]) => {
  window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: b, gamma: g, alpha: a }));
}, [beta, gamma, alpha]);

test('水平器: 平らに置くと0°で緑になる', async ({ page }) => {
  await openApp(page, 'level-ruler');
  await orient(page, 0.1, 0.1);
  await expect(page.locator('.big-number')).toHaveText('0.1°');
  await expect(page.locator('.vial')).toHaveClass(/level/);
  await orient(page, 10, 5);
  await expect(page.locator('.vial')).not.toHaveClass(/level/);
  await page.getByRole('tab', { name: '定規' }).click();
  await expect(page.locator('svg[aria-label*="mm"]')).toBeVisible();
});

test('スマホ首: うつむくと首の負担が増える', async ({ page }) => {
  await openApp(page, 'neck-angle');
  await orient(page, 90);
  await expect(page.locator('.big-number')).toHaveText('5 kg');
  await orient(page, 30);
  await expect(page.locator('.big-number')).toHaveText('27 kg');
});

test('スマホ伏せ: 伏せると計測し、持ち上げると記録される', async ({ page }) => {
  await openApp(page, 'phone-down');
  await page.getByRole('button', { name: 'はじめる' }).click();
  await orient(page, 179, 0);
  await page.waitForTimeout(1200);
  await orient(page, 30, 0);
  await expect(page.getByText(/持ち上げました/)).toBeVisible();
  await expect(page.locator('.stat').first()).not.toContainText('00:00');
});

test('揺れ計: 加速度イベントでgalが表示される', async ({ page }) => {
  await openApp(page, 'quake-meter');
  await page.getByRole('button', { name: '計測をはじめる' }).click();
  await page.evaluate(() => {
    for (let i = 0; i < 5; i++) window.dispatchEvent(new DeviceMotionEvent('devicemotion', { acceleration: { x: 0.3, y: 0, z: 0 }, accelerationIncludingGravity: { x: 0.3, y: 0, z: 9.8 }, interval: 16 }));
  });
  await expect(page.getByText(/最大 30\.0 gal/)).toBeVisible();
});

test('ルーレット: 回すと結果が出る', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, 'decider');
  await page.getByRole('button', { name: 'まわす' }).click();
  await expect(page.locator('.decider-result')).toHaveText(/🎉 (ラーメン|カレー|うどん|定食)/);
  await page.getByLabel('追加する選択肢').fill('そば');
  await page.getByRole('button', { name: '追加' }).click();
  await expect(page.getByText('そば')).toBeVisible();
});

test('避難場所コンパス: 座標で登録して案内できる', async ({ page }) => {
  await openApp(page, 'evac-compass');
  await page.getByLabel('名前').fill('皇居外苑');
  await page.getByLabel('座標または地図URL').fill('35.6800, 139.7570');
  await page.getByRole('button', { name: '座標で追加' }).click();
  await page.getByRole('button', { name: '🚨 いちばん近い避難場所へ' }).click();
  await expect(page.getByText('🏃 皇居外苑 へ')).toBeVisible();
  await expect(page.locator('.compass-dist')).toHaveText(/\d+ m/);
});

test('聖地巡礼: 現在地を登録するとスタンプが押せる', async ({ page }) => {
  await openApp(page, 'seichi-map');
  await page.getByLabel('名前').fill('東京駅');
  await page.getByRole('button', { name: '📍 いまいる場所を追加' }).click();
  await page.getByRole('button', { name: 'スタンプ' }).click();
  await expect(page.getByText('訪問 1 / 1 か所')).toBeVisible();
});

test('スタンプラリー: 作成 → URLで遊ぶ → スタンプ獲得', async ({ page }) => {
  await openApp(page, 'stamp-rally');
  await page.getByLabel('ラリーの名前').fill('テストラリー');
  await page.getByLabel('名前', { exact: true }).fill('駅');
  await page.getByRole('button', { name: '📍 いまいる場所を追加' }).click();
  await expect(page.getByText('1. 駅')).toBeVisible();
  await page.getByRole('button', { name: '参加URLを共有' }).click();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  const url = shared.match(/http:\/\/\S+#r=\S+/)?.[0];
  expect(url).toBeTruthy();
  await gotoFresh(page, url);
  await expect(page.getByRole('heading', { name: 'テストラリー' })).toBeVisible();
  await page.getByRole('button', { name: '㊞ スタンプを押す' }).click();
  await expect(page.getByText('🎉 コンプリート！')).toBeVisible();
});

test('スタンプラリー: 壊れたURLはエラー表示', async ({ page }) => {
  await page.goto('/apps/stamp-rally/#r=%%%broken');
  await expect(page.getByText('ラリーのURLが壊れています')).toBeVisible();
});

test('中間地点: 2人入れると中間地点が出る', async ({ page }) => {
  await openApp(page, 'midpoint');
  for (const [n, c] of [['A', '35.68, 139.70'], ['B', '35.68, 139.80']]) {
    await page.getByLabel('名前').fill(n);
    await page.getByLabel('座標または地図URL').fill(c);
    await page.getByRole('button', { name: '座標で追加' }).click();
  }
  await expect(page.getByText(/^35\.680\d\d, 139\.75000$/)).toBeVisible();
});

test('いまここリンク: 現在地を取得して共有文を作る', async ({ page }) => {
  await openApp(page, 'here-link');
  await page.getByRole('button', { name: '📍 現在地を取得' }).click();
  await expect(page.getByText(/^35\.68124, 139\.7671\d$/)).toBeVisible();
  await page.getByRole('button', { name: 'いまここにいます' }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('openstreetmap.org/?mlat=35.681236');
});

test('マジックアワー: 現在地で計算すると日の出が出る', async ({ page }) => {
  await openApp(page, 'sun-times');
  await page.getByRole('button', { name: '📍 現在地で計算' }).click();
  await expect(page.locator('li', { hasText: '日の出' }).locator('b')).toHaveText(/^0?[4-6]:\d\d$/);
});

test('高度計: 開始すると緯度経度が出る', async ({ page }) => {
  await openApp(page, 'altimeter');
  await page.getByRole('button', { name: '▶ 開始' }).click();
  await expect(page.getByText('35.68124')).toBeVisible();
});

test('おさんぽ記録: 移動すると距離が増える', async ({ page, context }) => {
  await openApp(page, 'walk-tracker');
  await page.getByRole('button', { name: '▶ スタート' }).click();
  for (let i = 1; i <= 4; i++) {
    await context.setGeolocation({ latitude: 35.681236 + i * 0.00003, longitude: 139.767125, accuracy: 5 });
    await page.waitForTimeout(400);
  }
  await expect(page.locator('.big-number')).not.toHaveText('0 m');
  await page.getByRole('button', { name: '■ ストップ' }).click();
  await expect(page.getByRole('button', { name: 'GPXで保存' })).toBeVisible();
});

test('熱中症ガード: 予報APIの結果から暑さ指数と安全な時間帯を出す', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (route) => {
    const hours = Array.from({ length: 24 }, (_, i) => `2026-08-01T${String(i).padStart(2, '0')}:00`);
    const temp = hours.map((_, i) => (i >= 10 && i <= 16 ? 36 : 26));
    route.fulfill({ json: {
      current: { temperature_2m: 35, relative_humidity_2m: 60, shortwave_radiation: 800, wind_speed_10m: 1 },
      hourly: { time: hours, temperature_2m: temp, relative_humidity_2m: hours.map(() => 60), shortwave_radiation: hours.map((_, i) => (i > 6 && i < 18 ? 700 : 0)), wind_speed_10m: hours.map(() => 1) },
    } });
  });
  await openApp(page, 'heat-guard');
  await expect(page.locator('.pill.danger').first()).toHaveText('危険');
  await expect(page.locator('.heat-cell')).toHaveCount(24);
  await page.getByRole('button', { name: '飲んだ' }).click();
  await expect(page.getByText('最後に飲んでから 0 分')).toBeVisible();
});

test('熱中症ガード: オフラインでも手入力で計算できる', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (route) => route.abort());
  await openApp(page, 'heat-guard');
  await expect(page.getByText(/予報を取得できませんでした/)).toBeVisible();
  await page.getByLabel('気温℃').fill('25');
  await page.getByLabel('湿度%').fill('40');
  await page.getByLabel('場所').selectOption({ label: '室内・夜' });
  await expect(page.locator('.pill.ok')).toHaveText('ほぼ安全');
});

test('洗濯タイマー: 開始すると一覧に出る', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (route) => route.fulfill({ json: { current: { temperature_2m: 28, relative_humidity_2m: 40 } } }));
  await openApp(page, 'laundry-timer');
  await page.getByRole('button', { name: /洗濯 45分/ }).click();
  await expect(page.locator('#app li', { hasText: '🌀 洗濯' })).toBeVisible();
  await expect(page.getByText('よく乾きます')).toBeVisible();
});
