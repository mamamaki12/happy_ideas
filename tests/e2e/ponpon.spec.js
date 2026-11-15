import { test, expect } from '@playwright/test';

test('ぽんぽん日記: 子どもを登録して、うんち・おくすり・トイレを記録する', async ({ page }) => {
  await page.goto('/products/ponpon/');
  await expect(page.locator('#app')).toBeHidden();
  await page.getByRole('button', { name: '＋ 子どもを登録' }).click();
  await page.getByLabel('呼び名').fill('はる');
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.locator('#today-title')).toContainText('はるのきょう');
  await expect(page.locator('#since')).toContainText('まだうんちの記録がありません');
  // うんち（かたさを選ばないと記録できない）
  await page.getByRole('button', { name: 'うんち出た', exact: true }).click();
  const log = page.locator('#log-dlg');
  await log.getByRole('button', { name: '記録する' }).click();
  await expect(log).toBeVisible();
  await log.getByRole('radio', { name: /ゴツゴツ/ }).check();
  await log.getByLabel('痛がった・りきんでも出にくかった').check();
  await log.getByRole('button', { name: '記録する' }).click();
  const reward = page.locator('#sticker-dlg');
  await expect(reward).toContainText('うんち出たね');
  await expect(reward).toContainText('1まい目');
  await reward.getByRole('button', { name: 'とじる' }).click();
  await expect(page.locator('#since')).toHaveText('きょうは出たよ！');
  await expect(page.locator('#today-list')).toContainText('うんち ゴツゴツ・痛がった');
  // おくすり（2回目は前の名前と量が入っている）
  await page.getByRole('button', { name: 'おくすり', exact: true }).click();
  await log.getByLabel('くすりの名前').fill('酸化マグネシウム');
  await log.getByLabel('量（任意）').fill('1包');
  await log.getByRole('button', { name: '記録する' }).click();
  await expect(page.locator('#status')).toContainText('おくすりを記録しました');
  await page.getByRole('button', { name: 'おくすり', exact: true }).click();
  await expect(log.getByLabel('くすりの名前')).toHaveValue('酸化マグネシウム');
  await expect(log.getByLabel('量（任意）')).toHaveValue('1包');
  await log.getByRole('button', { name: '閉じる' }).click();
  // トイレにすわった（すぐ記録してシール）
  await page.getByRole('button', { name: 'トイレにすわった', exact: true }).click();
  await expect(reward).toContainText('2まい目');
  await reward.getByRole('button', { name: 'とじる' }).click();
  await expect(page.locator('#stickers .sticker')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('#today-list li')).toHaveCount(3);
  await expect(page.locator('#calendar .is-today')).toHaveAttribute('aria-label', /うんち1回 おくすりあり/);
  // なおす
  await page.locator('#today-list li').filter({ hasText: 'ゴツゴツ' }).getByRole('button', { name: 'なおす' }).click();
  await log.getByRole('radio', { name: /バナナ/ }).check();
  await log.getByRole('button', { name: '記録する' }).click();
  await expect(page.locator('#today-list')).toContainText('うんち バナナ');
  await expect(reward).toBeHidden(); // なおしたときはシールを増やさない
  await expect(page.locator('#stickers .sticker')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('ぽんぽん日記: 受診用まとめ・消して元に戻す・バックアップと復元', async ({ page }) => {
  await page.goto('/products/ponpon/');
  await page.getByRole('button', { name: 'サンプルを見る' }).click();
  await expect(page.locator('#since')).toHaveText('最後のうんちは きのうです。');
  await page.getByRole('button', { name: '4週間分を作る' }).click();
  const report = page.locator('#report');
  await expect(report).toBeVisible();
  await expect(report.locator('#report-title')).toContainText('（28日間）');
  await expect(report.locator('#report-stats')).toContainText('13回');
  await expect(report.locator('#report-stats')).toContainText('酸化マグネシウム 16日');
  await expect(report.locator('tbody tr')).toHaveCount(28);
  // 文章をコピー
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await report.getByRole('button', { name: '文章をコピー' }).click();
  await expect(page.locator('#status')).toContainText('コピーしました');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/はるくん（サンプル）のうんちの記録/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // 昨日の記録を消して、元に戻す
  const yesterday = page.locator('#calendar button[aria-pressed]').filter({ has: page.locator('.dot') }).last();
  await yesterday.click();
  await expect(page.locator('#day-list li')).toHaveCount(2);
  await page.locator('#day-list li').filter({ hasText: 'うんち' }).getByRole('button', { name: 'けす' }).click();
  await expect(page.locator('#day-list li')).toHaveCount(1);
  await page.getByRole('status').getByRole('button', { name: '元に戻す' }).click();
  await expect(page.locator('#day-list li')).toHaveCount(2);
  // バックアップ → 子どもを削除 → 復元
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'バックアップ保存' }).click();
  const backup = await download;
  expect(backup.suggestedFilename()).toMatch(/^ponpon-.*\.json$/);
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'はるくん（サンプル）を編集' }).click();
  await page.getByRole('button', { name: 'この子の記録を削除' }).click();
  await expect(page.locator('#app')).toBeHidden();
  await page.locator('#import').setInputFiles(await backup.path());
  await expect(page.locator('#since')).toHaveText('最後のうんちは きのうです。');
  await page.locator('#import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"kids":[{}],"logs":[]}') });
  await expect(page.getByRole('status')).toContainText('復元できませんでした');
});

test('ぽんぽん日記: 保存済みの記録が読めないときは上書きしない', async ({ page }) => {
  await page.goto('/products/ponpon/');
  await page.evaluate(() => localStorage.setItem('happy-ideas-ponpon-v1', JSON.stringify({ version: 1, kids: [{ id: 'k', name: 'はる', emoji: '🐻' }], logs: [{ id: 'a', kid: 'k', type: 'poo', at: '2999-01-01T08:00', bristol: 4 }] })));
  await page.reload();
  await expect(page.getByRole('alert').filter({ hasText: '保存を止めています' })).toBeVisible();
  await page.getByRole('button', { name: 'サンプルを見る' }).click();
  await expect(page.getByRole('status')).toContainText('保存を止めています');
  expect(await page.evaluate(() => localStorage.getItem('happy-ideas-ponpon-v1'))).toContain('2999-01-01');
});
