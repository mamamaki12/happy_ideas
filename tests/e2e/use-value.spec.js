import { test, expect } from '@playwright/test';
test('モトログ: 登録・使用・取り消し・再読込・バックアップ復元',async({page})=>{
 await page.goto('/products/use-value/');
 await page.getByRole('button',{name:'＋ 持ち物を登録'}).click();
 await page.getByLabel('名前',{exact:true}).fill('テストの靴');
 await page.getByLabel('購入額（円）',{exact:true}).fill('200');
 await page.getByLabel('目標の1回あたり（円）',{exact:true}).fill('100');
 await page.getByRole('button',{name:'保存する',exact:true}).click();
 const card=page.locator('article').filter({hasText:'テストの靴'});
 await card.getByRole('button',{name:'今日使った ＋1'}).click();
 await expect(card.locator('.cost')).toHaveText('¥200 / 回');
 await card.getByRole('button',{name:'今日使った ＋1'}).click();
 await expect(card.locator('.badge')).toHaveText('✓ 目標達成！');
 await card.getByRole('button',{name:'1回戻す'}).click();
 await page.reload();
 await expect(card.locator('.cost')).toHaveText('¥200 / 回');
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'バックアップ保存'}).click();
 const backup=await download;
 expect(backup.suggestedFilename()).toMatch(/^motolog-.*\.json$/);
 page.on('dialog',d=>d.accept());
 await card.getByRole('button',{name:'削除',exact:true}).click();
 await expect(page.locator('article')).toHaveCount(0);
 await page.locator('#import').setInputFiles(await backup.path());
 await expect(card.locator('.cost')).toHaveText('¥200 / 回');
 await page.locator('#import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,"items":[{}]}')});
 await expect(page.getByRole('status')).toContainText('復元できませんでした');
 await expect(card).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

// ブラウザ（日本時間）での n 日後の日付
const dayInBrowser = (page, n) => page.evaluate((n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }, n);
const saved = (page, items) => page.evaluate((items) => localStorage.setItem('happy-ideas-motolog-v1', JSON.stringify({ version: 1, items })), items);
const shoe = (patch = {}) => ({ id: 'a1', name: '旅の靴', price: 9000, target: 100, purchased: '2026-01-10', rating: 4, note: '', uses: ['2026-01-11'], photo: '', ...patch });

test('モトログ: 保存済みの記録が読めないときは、上書きして消さない', async ({ page }) => {
  await page.goto('/products/use-value/');
  await saved(page, [shoe({ uses: ['2999-01-01'] })]); // 読み込めない記録（例: 端末の時計が大きくずれていたとき）
  await page.reload();
  await expect(page.getByRole('alert').filter({ hasText: '保存を止めています' })).toBeVisible();
  await page.getByRole('button', { name: 'サンプルを追加' }).click();
  await expect(page.getByRole('status')).toContainText('保存を止めています');
  expect(await page.evaluate(() => localStorage.getItem('happy-ideas-motolog-v1'))).toContain('2999-01-01'); // 元の記録は残る
  // バックアップからの復元はできる
  await page.locator('#import').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, items: [shoe()] })) });
  page.on('dialog', (d) => d.accept());
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.getByRole('alert').filter({ hasText: '保存を止めています' })).toHaveCount(0);
});

test('モトログ: 時差のある国へ移動して、記録の日付が「明日」になっていても開ける', async ({ page }) => {
  await page.goto('/products/use-value/');
  const tomorrow = await dayInBrowser(page, 1);
  await saved(page, [shoe({ uses: ['2026-01-11', tomorrow] })]);
  await page.reload();
  await expect(page.locator('article')).toContainText('2回使用');
  await page.getByRole('button', { name: '今日使った ＋1' }).click();
  await expect(page.locator('article')).toContainText('3回使用');
});

test('モトログ: 削除してもすぐ「元に戻す」で戻せる', async ({ page }) => {
  await page.goto('/products/use-value/');
  await saved(page, [shoe(), shoe({ id: 'b2', name: 'カメラ' })]);
  await page.reload();
  page.on('dialog', (d) => d.accept());
  await page.locator('article').filter({ hasText: '旅の靴' }).getByRole('button', { name: '削除', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('status').getByRole('button', { name: '元に戻す' }).click();
  await expect(page.locator('article')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('article').filter({ hasText: '旅の靴' })).toContainText('1回使用');
});

test('モトログ: 記録が増えたらバックアップをすすめ、「あとで」で隠せる', async ({ page }) => {
  await page.goto('/products/use-value/');
  await expect(page.locator('#backup-last')).toHaveText('まだバックアップを保存していません。');
  await page.getByRole('button', { name: 'サンプルを追加' }).click();
  const reminder = page.locator('#backup-reminder');
  await expect(reminder).toContainText('まだバックアップを保存していません');
  await reminder.getByRole('button', { name: 'あとで' }).click();
  await expect(reminder).toBeHidden();
  await page.reload();
  await expect(reminder).toBeHidden();
  await page.evaluate(() => localStorage.removeItem('happy-ideas-motolog-v1-backup'));
  await page.reload();
  const download = page.waitForEvent('download');
  await reminder.getByRole('button', { name: 'バックアップを保存' }).click();
  await download;
  await expect(reminder).toBeHidden();
  await expect(page.locator('#backup-last')).toHaveText(`最後のバックアップ: ${await dayInBrowser(page, 0)}`);
});
