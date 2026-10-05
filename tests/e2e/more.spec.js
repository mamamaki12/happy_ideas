// 追加した10個の試作の操作テスト
import { test, expect } from '@playwright/test';
import { openApp, gotoFresh } from './helpers.js';

test('体調サイクル: 開始日を記録すると予測が出る', async ({ page }) => {
  await openApp(page, 'cycle-memo');
  await page.getByRole('button', { name: '今日はじまった' }).click();
  await expect(page.getByText(/あと28日/)).toBeVisible();
  await page.getByRole('button', { name: '頭痛' }).click();
  await expect(page.getByRole('button', { name: '頭痛' })).toHaveAttribute('aria-pressed', 'true');
});

test('ショートドラマ: 話数と課金を記録', async ({ page }) => {
  await openApp(page, 'drama-log');
  await page.getByLabel('作品名').fill('社長の秘密');
  await page.getByLabel('全何話').fill('80');
  await page.getByRole('button', { name: '追加' }).click();
  await page.getByRole('button', { name: '+1話 観た' }).click();
  await expect(page.getByText(/1話 \/ 全80話/)).toBeVisible();
  await page.getByLabel('社長の秘密の課金額').fill('4000');
  await page.getByRole('button', { name: '課金を記録' }).click();
  await expect(page.getByText(/予算 3,000円 を 1,000円 超えています/)).toBeVisible();
});

test('ほしいものリスト: 作って共有 → 受け取り側で贈る', async ({ page }) => {
  await openApp(page, 'wishlist');
  await page.getByLabel('あなたの名前').fill('ゆき');
  await page.getByLabel('名前', { exact: true }).fill('電気ケトル');
  await page.getByLabel('商品ページ').fill('javascript:alert(1)');
  await page.getByRole('button', { name: '追加' }).click();
  await expect(page.getByText('URLは http(s) で入れてください')).toBeVisible();
  await page.getByLabel('商品ページ').fill('https://example.com/kettle');
  await page.getByRole('button', { name: '追加' }).click();
  await page.getByRole('button', { name: 'リストのURLを共有' }).click();
  const url = (await page.evaluate(() => navigator.clipboard.readText())).match(/http:\/\/\S+#w=\S+/)[0];
  await gotoFresh(page, url);
  await expect(page.getByRole('heading', { name: '🎁 ゆきさんのほしいもの' })).toBeVisible();
  await expect(page.getByRole('link', { name: '🔗 商品ページ' })).toHaveAttribute('href', 'https://example.com/kettle');
  await page.getByRole('button', { name: 'これを贈る' }).click();
  await expect(page.getByText('贈る予定')).toBeVisible();
});

test('ほしいものリスト: 細工したURLの javascript: リンクは無効化', async ({ page }) => {
  const { encodeData } = await import('../../shared/urldata.js');
  await page.goto(`/apps/wishlist/#w=${encodeData({ owner: 'x', items: [{ name: 'evil', url: 'javascript:alert(1)' }] })}`);
  await expect(page.getByText('evil')).toBeVisible();
  await expect(page.getByRole('link', { name: '🔗 商品ページ' })).toHaveCount(0);
});

test('家族の防災プラン: 入力するとカードが描かれる', async ({ page }) => {
  await openApp(page, 'family-plan');
  await page.getByLabel('第1集合場所（家の近く）').fill('公園の時計の下');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '📤 家族に送る / 保存' }).click()]);
  expect(dl.suggestedFilename()).toBe('bousai-plan.png');
});

test('大雨タイムライン: 予報から雨の始まりを出す', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (route) => {
    const now = new Date(); const time = Array.from({ length: 48 }, (_, i) => { const d = new Date(now.getTime() + i * 3600000); return `${d.toISOString().slice(0, 13)}:00`; });
    route.fulfill({ json: { hourly: { time, precipitation: time.map((_, i) => (i >= 3 && i <= 5 ? 35 : 0)), precipitation_probability: time.map((_, i) => (i >= 3 && i <= 5 ? 90 : 10)) } } });
  });
  await openApp(page, 'rain-timeline');
  await expect(page.locator('.big-number')).toHaveText(/☔ .*から/);
  await expect(page.getByText('部屋干しがおすすめ')).toBeVisible();
  await expect(page.locator('.rb')).toHaveCount(48);
});

test('ローカル要約: 抽出型で要約できる（通信なし）', async ({ page }) => {
  await openApp(page, 'local-summary');
  await page.getByLabel('文章').fill('熱中症の対策には水分補給が大切です。特に高齢者は水分補給を意識しましょう。今日の昼ごはんはカレーでした。暑さ指数が高い日は外出を控えましょう。水分補給と休憩で熱中症を防げます。');
  await page.getByRole('button', { name: '要約する' }).click();
  await expect(page.locator('#app ol li')).toHaveCount(3);
  await expect(page.getByText(/通信なし/)).toBeVisible();
});

test('ソロ活スポット: タグつきで記録', async ({ page }) => {
  await openApp(page, 'solo-spots');
  await page.getByLabel('名前').fill('駅前ラーメン');
  await page.getByRole('button', { name: 'カウンター席' }).click();
  await page.getByRole('button', { name: '記録' }).click();
  await expect(page.locator('li', { hasText: '駅前ラーメン' })).toContainText('カウンター席');
});

test('騒音マップ: 計測開始と停止', async ({ page }) => {
  await openApp(page, 'noise-map');
  await page.getByRole('button', { name: '▶ 計測開始' }).click();
  await expect(page.locator('.big-number')).toHaveText(/^\d+ dB$/);
  await page.getByRole('button', { name: '■ 停止' }).click();
});

test('ペット散歩: イベントを記録して終了', async ({ page }) => {
  await openApp(page, 'pet-walk');
  await page.getByRole('button', { name: '🐾 散歩スタート' }).click();
  await page.getByRole('button', { name: '💧 おしっこ' }).click();
  await page.getByRole('button', { name: '■ おわり' }).click();
  await expect(page.getByText(/今日 1回/)).toBeVisible();
  await expect(page.locator('#app li').first()).toContainText('💧1');
});

test('家族の予定: 作ってURLで共有 → 受け取って .ics', async ({ page }) => {
  await openApp(page, 'family-schedule');
  await page.getByLabel('内容').fill('参観日');
  await page.getByLabel('担当').fill('パパ');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await page.getByRole('button', { name: '📤 URLで送る' }).click();
  const url = (await page.evaluate(() => navigator.clipboard.readText())).match(/http:\/\/\S+#s=\S+/)[0];
  await gotoFresh(page, url);
  await expect(page.getByText('参観日')).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '📅 カレンダーに追加（.ics）' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^family-schedule-.*\.ics$/);
});
