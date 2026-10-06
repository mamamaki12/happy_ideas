// サーバーなしの WebRTC 接続（同じブラウザの2つのタブで、接続コードを手で受け渡す）と、地点共有系
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

async function connect(a, b, connected = (pg) => pg.getByText('✅ つながりました')) {
  await a.getByRole('button', { name: '📨 招待する' }).click();
  const invite = await a.getByLabel('招待コード').inputValue({ timeout: 15000 });
  expect(invite.length).toBeGreaterThan(50);
  await b.getByRole('button', { name: '📩 招待された' }).click();
  await b.getByLabel('① 相手から届いた招待コード').fill(invite);
  await b.getByRole('button', { name: '返事コードを作る' }).click();
  const answer = await b.getByLabel('返事コード').inputValue({ timeout: 15000 });
  await a.getByLabel('② 相手から届いた返事コード').fill(answer);
  await a.getByRole('button', { name: 'つなぐ' }).click();
  await expect(connected(a)).toBeVisible({ timeout: 20000 });
}

test('P2Pトランシーバー: 2つのタブがコード交換だけでつながり、チャットが届く', async ({ context }) => {
  test.setTimeout(60000);
  const a = await context.newPage(); const b = await context.newPage();
  await openApp(a, 'p2p-talk'); await openApp(b, 'p2p-talk');
  await a.getByRole('button', { name: '💬 チャットだけ' }).click();
  await b.getByRole('button', { name: '💬 チャットだけ' }).click();
  await connect(a, b, (pg) => pg.getByLabel('メッセージ'));
  await expect(b.getByLabel('メッセージ')).toBeVisible({ timeout: 20000 });
  await a.getByLabel('メッセージ').fill('こんにちは <b>太字</b>');
  await a.getByRole('button', { name: '送信' }).click();
  await expect(b.locator('.chat li.them')).toContainText('こんにちは <b>太字</b>'); // HTMLとして解釈されない
  await expect(b.locator('.chat b')).toHaveCount(0);
});

test('P2Pトランシーバー: 壊れたコードはエラー', async ({ page }) => {
  await openApp(page, 'p2p-talk');
  await page.getByRole('button', { name: '💬 チャットだけ' }).click();
  await page.getByRole('button', { name: '📩 招待された' }).click();
  await page.getByLabel('① 相手から届いた招待コード').fill('でたらめ');
  await page.getByRole('button', { name: '返事コードを作る' }).click();
  await expect(page.getByText('接続コードが正しくありません')).toBeVisible();
});

test('その場で写真交換: 写真が相手に届く', async ({ context }) => {
  test.setTimeout(60000);
  const a = await context.newPage(); const b = await context.newPage();
  await openApp(a, 'photo-relay'); await openApp(b, 'photo-relay');
  await connect(a, b);
  // 1x1 の PNG を作って送る
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await a.getByLabel('送る写真を選ぶ').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: png });
  await expect(a.getByText('送信済み')).toBeVisible({ timeout: 15000 });
  await expect(b.getByText('📥 受信')).toBeVisible({ timeout: 15000 });
  await expect(b.locator('.relay-grid img')).toHaveCount(1);
});

test('ヒヤリハット地図: 記録 → GeoJSON書き出し → 取り込み（重複除外・不正値除外）', async ({ page }) => {
  await openApp(page, 'hazard-map');
  await page.getByLabel('くわしく').fill('朝は車が多い');
  await page.getByRole('button', { name: '📍 記録する' }).click();
  await expect(page.getByText('記録（1件）')).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '📤 GeoJSONで配る' }).click()]);
  const json = JSON.parse(Buffer.concat(await (await dl.createReadStream()).toArray()).toString());
  expect(json.features[0].properties.note).toBe('朝は車が多い');
  json.features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [139.7, 35.7] }, properties: { kind: '<img src=x onerror=alert(1)>', note: 'x'.repeat(500) } });
  json.features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [999, 35.7] }, properties: {} });
  await page.getByLabel('GeoJSONファイルを取り込む').setInputFiles({ name: 'other.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(JSON.stringify(json)) });
  await expect(page.getByText('記録（2件）')).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await expect(page.locator('li', { hasText: '⚠ その他' })).toBeVisible(); // 不明な種類は「その他」に
});

test('トイレマップ: 登録 → URLで配る → 別の人が取り込んで案内', async ({ page, context }) => {
  await openApp(page, 'spot-share');
  await page.getByLabel('種類').selectOption('toilet');
  await page.getByLabel('メモ').fill('駅の改札外');
  await page.getByRole('button', { name: '📍 登録' }).click();
  await page.getByRole('button', { name: '📤 URLで配る / Share' }).click();
  const url = (await page.evaluate(() => navigator.clipboard.readText())).match(/http:\/\/\S+#p=\S+/)[0];
  const other = await context.newPage();
  await other.goto('/index.html');
  await other.evaluate(() => localStorage.clear());
  await other.goto(url);
  await expect(other.getByText('トイレ / Restroom')).toBeVisible();
  await other.getByRole('button', { name: '案内' }).click();
  await expect(other.locator('.compass-dist')).toHaveText(/\d+ m/);
});
