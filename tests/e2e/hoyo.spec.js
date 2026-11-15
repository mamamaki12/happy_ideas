import { test, expect } from '@playwright/test';

// ブラウザ（日本時間）での n 日後の日付
const dayInBrowser = (page, n) => page.evaluate((n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }, n);

test('法要ごよみ: 登録すると法要が並び、準備を記録できる', async ({ page }) => {
  await page.goto('/products/hoyo/');
  await expect(page.locator('#ics')).toBeDisabled();
  await page.getByRole('button', { name: '＋ 故人を登録' }).click();
  await page.getByLabel('お名前（呼び名でも）').fill('山田 一郎');
  const death = await dayInBrowser(page, -10);
  await page.getByLabel('命日', { exact: true }).fill(death);
  await page.getByLabel('続柄（任意）').fill('父');
  await page.getByRole('button', { name: '保存する' }).click();
  // 命日の10日後なので、二七日（14日目）が次の法要。四十九日・百か日・一周忌も並ぶ
  const up = page.locator('#upcoming');
  await expect(up.locator('article').first()).toContainText('山田 一郎さん 二七日');
  await expect(up).toContainText('四十九日');
  await expect(up).toContainText('一周忌');
  await expect(page.locator('#people')).toContainText('次の法要: 二七日');
  // 四十九日の準備を開いて、直前の土曜日にずらし、準備を1つ済ませる
  await up.locator('article').filter({ hasText: '四十九日' }).getByRole('button', { name: '準備を開く' }).click();
  const dlg = page.locator('#event-dlg');
  await expect(dlg.getByRole('checkbox')).toHaveCount(7); // 準備6つ＋「済んだ」
  await dlg.getByRole('button', { name: '直前の土曜日にする' }).click();
  await dlg.getByLabel(/お寺（僧侶）に日にちを相談する/).check();
  await dlg.getByLabel('お布施など（円・任意）').fill('30000');
  await dlg.getByRole('button', { name: '保存する' }).click();
  const card49 = up.locator('article').filter({ hasText: '四十九日' });
  await expect(card49).toContainText('準備 1/6');
  await expect(card49).toContainText('土');
  await page.reload();
  await expect(up.locator('article').filter({ hasText: '四十九日' })).toContainText('準備 1/6');
  // 一覧
  await page.getByRole('button', { name: '法要の一覧' }).click();
  await expect(page.locator('#all-list li')).toHaveCount(17);
  await expect(page.locator('#all-list')).toContainText('五十回忌');
  await page.locator('#list-dlg').getByRole('button', { name: '閉じる' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('法要ごよみ: カレンダー用ファイル・バックアップ・復元・削除の取り消し', async ({ page }) => {
  await page.goto('/products/hoyo/');
  await page.evaluate(() => { Object.defineProperty(navigator, 'canShare', { value: undefined }); });
  await page.getByRole('button', { name: 'サンプルを見る' }).click();
  await expect(page.locator('#people article')).toHaveCount(2);
  const ics = page.waitForEvent('download');
  await page.getByRole('button', { name: 'カレンダー用ファイルを保存' }).click();
  const file = await ics;
  expect(file.suggestedFilename()).toMatch(/^hoyo-.*\.ics$/);
  const body = (await (await import('node:fs/promises')).readFile(await file.path(), 'utf8'));
  expect(body).toContain('BEGIN:VCALENDAR');
  expect(body).toContain('祖母（サンプル）さん 一周忌');
  expect(body.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'バックアップ保存' }).click();
  const backup = await dl;
  page.on('dialog', (d) => d.accept());
  await page.locator('#people article').first().getByRole('button', { name: '削除' }).click();
  await expect(page.locator('#people article')).toHaveCount(1);
  await page.getByRole('button', { name: '元に戻す' }).click();
  await expect(page.locator('#people article')).toHaveCount(2);
  await page.locator('#people article').first().getByRole('button', { name: '削除' }).click();
  await page.locator('#import').setInputFiles(await backup.path());
  await expect(page.locator('#people article')).toHaveCount(2);
  await page.locator('#import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"people":[{}],"events":{}}') });
  await expect(page.getByRole('status')).toContainText('復元できませんでした');
});

test('法要ごよみ: 家族に送ったリンクを開くと登録できる', async ({ page }) => {
  await page.goto('/products/hoyo/');
  const death = await dayInBrowser(page, -200);
  const link = await page.evaluate(async (death) => {
    const { encodeData } = await import('/shared/urldata.js');
    const { sharePayload } = await import('/products/hoyo/logic.js');
    return encodeData(sharePayload([{ name: '佐藤 花子', kaimyo: '', relation: '母', death, kansai: false }]));
  }, death);
  await page.goto(`/products/hoyo/#share=${link}`);
  await expect(page.locator('#incoming')).toContainText('佐藤 花子さん');
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page.locator('#people')).toContainText('佐藤 花子');
  expect(await page.evaluate(() => location.hash)).toBe('');
  // 壊れたリンク
  await page.goto('/products/hoyo/#share=AAAA');
  await expect(page.getByRole('status')).toContainText('読み込めませんでした');
});

test('法要ごよみ: 保存済みの記録が読めないときは上書きしない', async ({ page }) => {
  await page.goto('/products/hoyo/');
  await page.evaluate(() => localStorage.setItem('happy-ideas-hoyo-v1', JSON.stringify({ version: 1, people: [{ id: 'x', name: 'A', death: '2999-01-01', kansai: false, relation: '', kaimyo: '', memo: '' }], events: {} })));
  await page.reload();
  await expect(page.getByRole('alert').filter({ hasText: '保存を止めています' })).toBeVisible();
  await page.getByRole('button', { name: 'サンプルを見る' }).click();
  expect(await page.evaluate(() => localStorage.getItem('happy-ideas-hoyo-v1'))).toContain('2999-01-01');
});
