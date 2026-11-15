import { test, expect } from '@playwright/test';

test('句ひろば: 広場がないときは句帳として使える（お題・音の数・直す・削除と取り消し・バックアップ）', async ({ page }) => {
  await page.goto('/products/kuhiroba/');
  await expect(page.locator('#plaza-status')).toContainText('広場は準備中です');
  const topic = await page.locator('#topic-word').textContent();
  await page.getByRole('button', { name: 'このお題でよむ' }).click();
  const dlg = page.locator('#write-dlg');
  await expect(dlg.getByLabel('季語（任意）')).toHaveValue(topic);
  await expect(page.locator('#post-box')).toBeHidden(); // 広場がないときは出さない
  await dlg.getByLabel('句', { exact: true }).fill('古池や 蛙飛びこむ 水の音');
  await expect(page.locator('#mora')).toContainText('「よみ」を入れると');
  await dlg.getByLabel(/^よみ/).fill('ふるいけや かわずとびこむ みずのおと');
  await expect(page.locator('#mora')).toHaveText('音の数: 5・7・5（17音） 五・七・五です');
  await dlg.getByRole('button', { name: '句帳に保存' }).click();
  const card = page.locator('#book article');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(`季語「${topic}」・5・7・5（17音）`);
  // 季語を自分で入れないときは、句の中の季語を拾う
  await page.getByRole('button', { name: '＋ 一句よむ' }).click();
  await dlg.getByLabel('句', { exact: true }).fill('木枯や 竹に隠れて しづまりぬ');
  await expect(dlg.getByLabel('季語（任意）')).toHaveValue('木枯');
  await dlg.getByRole('button', { name: '句帳に保存' }).click();
  await expect(card).toHaveCount(2);
  await page.reload();
  await expect(page.locator('#book-count')).toHaveText('2句');
  // 直す
  await card.filter({ hasText: '竹に' }).getByRole('button', { name: '直す' }).click();
  await dlg.getByLabel(/^メモ/).fill('散歩の途中で');
  await dlg.getByRole('button', { name: '句帳に保存' }).click();
  await expect(card.filter({ hasText: '竹に' })).toContainText('散歩の途中で');
  // 削除して元に戻す
  page.on('dialog', (d) => d.accept());
  await card.filter({ hasText: '竹に' }).getByRole('button', { name: '削除' }).click();
  await expect(card).toHaveCount(1);
  await page.getByRole('status').getByRole('button', { name: '元に戻す' }).click();
  await expect(card).toHaveCount(2);
  // バックアップと復元
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'バックアップ保存' }).click();
  const backup = await download;
  expect(backup.suggestedFilename()).toMatch(/^kuhiroba-.*\.json$/);
  await page.evaluate(() => localStorage.removeItem('happy-ideas-kuhiroba-v1'));
  await page.reload();
  await expect(card).toHaveCount(0);
  await page.locator('#import').setInputFiles(await backup.path());
  await expect(card).toHaveCount(2);
  await page.locator('#import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"entries":[{"id":"a"}]}') });
  await expect(page.locator('#status')).toContainText('復元できませんでした');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('句ひろば: 広場があるときは、出す・いいね・報告・下げるができる', async ({ page }) => {
  // 広場のサーバーの代わり
  const posts = [{ id: 'f'.repeat(32), text: '柿食へば 鐘が鳴るなり 法隆寺', kigo: '柿', name: '子規', photo: false, likes: 2, created: Date.now() - 60000 }];
  const sent = [];
  await page.route('**/api/haiku**', async (route) => {
    const req = route.request(); const url = new URL(req.url()); const body = req.postDataJSON?.() ?? null;
    sent.push({ method: req.method(), path: url.pathname, body });
    const reply = (json, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
    if (req.method() === 'GET') return reply({ posts: posts.filter((p) => !url.searchParams.get('kigo') || p.kigo === url.searchParams.get('kigo')), next: null });
    const m = url.pathname.match(/\/api\/haiku\/([a-f0-9]{32})\/(like|report|delete)$/);
    if (!m) { const id = 'a'.repeat(32); posts.unshift({ id, text: body.text, kigo: body.kigo, name: body.name || 'よみ人しらず', photo: !!body.photo, likes: 0, created: Date.now() }); return reply({ ok: true, id }, 201); }
    const p = posts.find((x) => x.id === m[1]);
    if (m[2] === 'like') { p.likes++; return reply({ ok: true, likes: p.likes }); }
    if (m[2] === 'delete') { posts.splice(posts.indexOf(p), 1); return reply({ ok: true }); }
    return reply({ ok: true });
  });
  page.on('dialog', (d) => d.accept());
  await page.goto('/products/kuhiroba/');
  const plaza = page.locator('#plaza article');
  await expect(plaza).toHaveCount(1);
  await expect(plaza).toContainText('子規');
  // いいね（2回押しても1回）
  await plaza.getByRole('button', { name: 'いいね 2' }).click();
  await expect(plaza.getByRole('button', { name: 'いいね 3' })).toHaveAttribute('aria-pressed', 'true');
  await plaza.getByRole('button', { name: 'いいね 3' }).click();
  expect(sent.filter((s) => s.path.endsWith('/like')).length).toBe(1);
  expect(sent.find((s) => s.path.endsWith('/like')).body.device).toMatch(/^[a-f0-9]{32}$/);
  // 句を出す
  await page.getByRole('button', { name: '＋ 一句よむ' }).click();
  const dlg = page.locator('#write-dlg');
  await dlg.getByLabel('句', { exact: true }).fill('しぐるるや 駅の灯りの にじみけり');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await page.locator('#photo-input').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('#photo-preview')).toBeVisible();
  await dlg.getByLabel('ひろばにも出す').check();
  await dlg.getByLabel(/^俳号/).fill('しんちゃん');
  await dlg.getByRole('button', { name: '句帳に保存' }).click();
  await expect(page.locator('#status')).toContainText('広場に出しました');
  const created = sent.find((s) => s.method === 'POST' && s.path.endsWith('/api/haiku'));
  expect(created.body).toMatchObject({ text: 'しぐるるや 駅の灯りの にじみけり', name: 'しんちゃん' });
  expect(created.body.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  expect(created.body.photo).toMatch(/^\/9j\//); // 縮めた JPEG（Base64）
  await expect(plaza).toHaveCount(2);
  await expect(plaza.first()).toContainText('わたしの句');
  await expect(page.locator('#book article')).toContainText('広場に出しています');
  // 俳号は次から入っている
  await page.getByRole('button', { name: '＋ 一句よむ' }).click();
  await expect(dlg.getByLabel(/^俳号/)).toHaveValue('しんちゃん');
  await dlg.getByRole('button', { name: '閉じる' }).click();
  // 報告すると自分の画面から消える
  await plaza.filter({ hasText: '子規' }).getByRole('button', { name: '報告' }).click();
  await expect(plaza).toHaveCount(1);
  expect(sent.some((s) => s.path.endsWith(`${'f'.repeat(32)}/report`))).toBe(true);
  // 広場から下げる（合言葉を送る）
  await page.locator('#book article').getByRole('button', { name: '広場から下げる' }).click();
  await expect(plaza).toHaveCount(0);
  expect(sent.find((s) => s.path.endsWith('/delete')).body.token).toMatch(/^[a-f0-9]{64}$/);
  await expect(page.locator('#book article')).not.toContainText('広場に出しています');
  await expect(page.locator('#book article').getByRole('button', { name: 'ひろばに出す' })).toBeVisible();
  // お題のタブ
  await page.locator('#tab-topic').click();
  await expect(page.locator('#plaza-status')).toContainText('の句はまだありません');
});

test('句ひろば: 保存済みの句帳が読めないときは上書きしない', async ({ page }) => {
  await page.goto('/products/kuhiroba/');
  await page.evaluate(() => localStorage.setItem('happy-ideas-kuhiroba-v1', JSON.stringify({ version: 1, entries: [{ id: 'a', text: '未来の句', yomi: '', kigo: '', date: '2999-01-01', memo: '', photo: '' }] })));
  await page.reload();
  await expect(page.getByRole('alert').filter({ hasText: '保存を止めています' })).toBeVisible();
  await page.getByRole('button', { name: '＋ 一句よむ' }).click();
  await page.getByLabel('句', { exact: true }).fill('ためしの句 ですよ');
  await page.getByRole('button', { name: '句帳に保存' }).click();
  await expect(page.locator('#status')).toContainText('保存を止めています');
  expect(await page.evaluate(() => localStorage.getItem('happy-ideas-kuhiroba-v1'))).toContain('2999-01-01');
});
