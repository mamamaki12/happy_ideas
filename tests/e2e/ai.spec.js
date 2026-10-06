// Claude API を使う10個のアプリ（#101〜#110）
// - サーバー未設定（このテスト環境）ではデモ表示で一通り動く
// - サーバーがあるとき（通信を差し替えて再現）は、決まった形で送り、AIの出力を安全に表示する
import { test, expect } from '@playwright/test';
import { trackErrors } from './helpers.js';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const photo = { name: 'photo.png', mimeType: 'image/png', buffer: PNG };
const XSS = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';

/** 各アプリの「入力してボタンを押す」と、デモの結果に出るはずの文字 */
const FLOWS = {
  'ai-print': { photo: true, button: 'AIで整理する', expect: '秋の遠足のお知らせ' },
  'ai-scam-check': { fill: [['届いたメッセージ', '【配送】不在のため持ち帰りました http://example.invalid']], button: '詐欺かどうか調べる', expect: '危険度：高' },
  'ai-fridge-recipe': { photo: true, button: '献立を考えてもらう', expect: '豚キャベツのみそ炒め' },
  'ai-soft-rewrite': { fill: [['下書き', '飲み会行けない']], button: 'やわらかく書き直す', expect: '丁寧' },
  'ai-doc-explain': { photo: true, button: 'やさしく説明してもらう', expect: '国民健康保険料の納付書' },
  'ai-menu': { photo: true, button: '説明してもらう / Explain', expect: 'だし巻き' },
  'ai-why': { fill: [['しつもん', 'そらはなんであおいの？']], button: 'はかせに きく', expect: 'やってみよう' },
  'ai-receipt': { photo: true, button: 'AIで読み取る', expect: '家計簿に追加' },
  'ai-oshi-letter': { fill: [['伝えたいこと（メモでOK）', '・歌に救われた']], button: '文章を整える', expect: '送る前に' },
};

for (const [slug, f] of Object.entries(FLOWS)) {
  test(`${slug}: サーバーなしではデモ表示で一通り動く`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`/apps/${slug}/`);
    await expect(page.locator('.ai-notice')).toContainText('デモ表示中');
    // 入力しないで押すと案内が出て、AIには頼まない
    await page.getByRole('button', { name: f.button }).click();
    await expect(page.locator('.ai-demo-badge')).toHaveCount(0);
    if (f.photo) await page.locator('input[type=file]').first().setInputFiles(photo);
    for (const [label, text] of f.fill || []) await page.getByLabel(label, { exact: true }).fill(text);
    await page.getByRole('button', { name: f.button }).click();
    await expect(page.locator('.ai-demo-badge')).toBeVisible();
    await expect(page.locator('#app')).toContainText(f.expect);
    await expect(page.locator('#app')).not.toContainText('[object ');
    expect(errors).toEqual([]);
  });
}

test('ai-talk: デモ表示で会話が続き、履歴を送る', async ({ page }) => {
  await page.goto('/apps/ai-talk/');
  await expect(page.locator('.talk-msg.ai').first()).toContainText('What can I get for you');
  await page.getByLabel('英語で入力').fill('I want coffee');
  await page.getByRole('button', { name: '送る' }).click();
  await expect(page.locator('.talk-fix')).toContainText('Could I have a coffee');
  await expect(page.locator('.talk-msg')).toHaveCount(3);
  // 場面を変えると最初から
  await page.getByLabel('場面').selectOption('hotel');
  await expect(page.locator('.talk-msg')).toHaveCount(1);
  await expect(page.locator('.talk-msg.ai')).toContainText('reservation');
});

test('ai-receipt: 読み取り結果を直して家計簿に追加し、月の集計に出る', async ({ page }) => {
  await page.goto('/apps/ai-receipt/');
  await page.locator('input[type=file]').setInputFiles(photo);
  await page.getByRole('button', { name: 'AIで読み取る' }).click();
  await expect(page.locator('#app')).toContainText('一致しています');
  await page.getByLabel('1行目の金額').fill('300');
  await expect(page.locator('#app')).toContainText('差: -62円');
  await page.getByLabel('合計（円）').fill('1894');
  await expect(page.locator('#app')).toContainText('一致しています');
  await page.getByRole('button', { name: '家計簿に追加' }).click();
  await expect(page.locator('.big-number')).toHaveText('1,894円');
  await expect(page.locator('#app')).toContainText('スーパーみどり');
  await page.reload();
  await expect(page.locator('.big-number')).toHaveText('1,894円');
});

test('ai-print: 保存すると締め切りが一覧に出て、持ち物のチェックが残る', async ({ page }) => {
  await page.goto('/apps/ai-print/');
  await page.locator('input[type=file]').setInputFiles(photo);
  await page.getByRole('button', { name: 'AIで整理する' }).click();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'カレンダーに追加（.ics）' }).click();
  expect((await dl).suggestedFilename()).toBe('print-events.ics');
  await page.getByRole('button', { name: 'このプリントを保存' }).click();
  await expect(page.locator('#app')).toContainText('近い締め切り');
  await page.locator('summary', { hasText: '秋の遠足のお知らせ' }).click();
  await page.getByLabel('水筒').check();
  await page.reload();
  await page.locator('summary', { hasText: '秋の遠足のお知らせ' }).click();
  await expect(page.getByLabel('水筒')).toBeChecked();
});

/** サーバーあり（ready）を再現して、送った内容を記録する */
async function liveServer(page, { result, status = 200, needsCode = false }) {
  const sent = [];
  await page.route('**/api/ai', (r) => r.fulfill({ json: { ready: true, needsCode } }));
  await page.route('**/api/ai/*', async (r) => {
    sent.push({ url: r.request().url(), body: r.request().postDataJSON(), headers: r.request().headers() });
    await r.fulfill(status === 200 ? { json: { result } } : { status, json: { error: 'x' } });
  });
  return sent;
}

test('サーバーあり: 写真はJPEGのbase64で送り、AIの出力に含まれるHTMLは文字として表示する', async ({ page }) => {
  const sent = await liveServer(page, { result: { ingredients: [XSS], recipes: [{ name: XSS, minutes: 5, uses: [XSS], extra: [], steps: [XSS], tip: XSS }], note: XSS } });
  await page.goto('/apps/ai-fridge-recipe/');
  await expect(page.locator('.ai-notice')).toContainText('Claude API へ送られます');
  await page.locator('input[type=file]').setInputFiles(photo);
  await page.getByLabel('使わない食材').fill('えび');
  await page.getByRole('button', { name: '献立を考えてもらう' }).click();
  await expect(page.locator('.ai-block b').first()).toHaveText(XSS);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  expect(await page.locator('#app img[src="x"], #app script').count()).toBe(0);
  await expect(page.locator('.ai-demo-badge')).toHaveCount(0);
  expect(sent).toHaveLength(1);
  expect(sent[0].url).toMatch(/\/api\/ai\/fridge-recipe$/);
  expect(sent[0].body.image.type).toBe('image/jpeg');
  expect(sent[0].body.image.data).toMatch(/^[A-Za-z0-9+/]+=*$/);
  expect(sent[0].body.fields).toEqual({ servings: 2, minutes: '20', avoid: 'えび' });
  // システムプロンプトやモデルはクライアントから送らない
  expect(Object.keys(sent[0].body).sort()).toEqual(['fields', 'image']);
});

test('サーバーあり: 詐欺判定の結果にURLがあってもリンクにしない', async ({ page }) => {
  await liveServer(page, { result: { level: 'low', verdict: 'https://evil.example/login を開いて', pattern: '', reasons: ['javascript:alert(1)'], actions: [] } });
  await page.goto('/apps/ai-scam-check/');
  await page.getByLabel('届いたメッセージ', { exact: true }).fill('test');
  await page.getByRole('button', { name: '詐欺かどうか調べる' }).click();
  await expect(page.locator('.scam-level')).toContainText('目立った特徴なし');
  // リンクは相談窓口の電話番号だけ
  expect(await page.locator('.ai-out a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['tel:%239110', 'tel:188']);
  await expect(page.locator('.ai-out')).toContainText('安全とは限りません');
});

test('サーバーあり: エラーを分かる言葉で出し、ボタンは押せる状態に戻る', async ({ page }) => {
  await liveServer(page, { status: 429 });
  await page.goto('/apps/ai-soft-rewrite/');
  await page.getByLabel('下書き', { exact: true }).fill('a');
  const btn = page.getByRole('button', { name: 'やわらかく書き直す' });
  await btn.click();
  await expect(page.getByRole('alert')).toContainText('今日の利用回数の上限');
  await expect(btn).toBeEnabled();
});

test('サーバーあり: アクセスコードを設定すると、ヘッダーで送る', async ({ page }) => {
  const sent = await liveServer(page, { needsCode: true, result: { answer: 'こたえ', try: '', next: '' } });
  await page.goto('/apps/ai-why/');
  await page.getByLabel('アクセスコード（試用中）').fill('beta-2026');
  await page.getByLabel('アクセスコード（試用中）').press('Tab');
  await page.getByLabel('しつもん', { exact: true }).fill('なんで？');
  await page.getByRole('button', { name: 'はかせに きく' }).click();
  await expect(page.locator('.why-bubble')).toContainText('こたえ');
  expect(sent[0].headers['x-access-code']).toBe('beta-2026');
  expect(sent[0].body.fields).toEqual({ question: 'なんで？', age: 6 });
});

test('サーバーあり: 英会話は直近の会話だけを履歴として送る', async ({ page }) => {
  const sent = await liveServer(page, { result: { reply: 'Great!', reply_ja: 'いいね', correction: '', better: '', hint_ja: '' } });
  await page.goto('/apps/ai-talk/');
  for (const t of ['Hello', 'Coffee please']) {
    await page.getByLabel('英語で入力').fill(t);
    await page.getByRole('button', { name: '送る' }).click();
    await expect(page.locator('.talk-msg.me').last()).toHaveText(t);
    await expect(page.getByRole('button', { name: '送る' })).toBeEnabled();
  }
  expect(sent).toHaveLength(2);
  expect(sent[1].body.history).toEqual([{ role: 'ai', text: 'Hi! What can I get for you today?' }, { role: 'user', text: 'Hello' }, { role: 'ai', text: 'Great!' }]);
  expect(sent[1].body.fields).toEqual({ scene: 'cafe', level: 'beginner', text: 'Coffee please' });
});
