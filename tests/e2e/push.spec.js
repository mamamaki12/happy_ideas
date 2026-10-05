// 推し活手帳のサーバー通知: 本物のAPIコード（D1はSQLite）につなぎ、PushManager はテスト用の偽物にする
import { test, expect } from '@playwright/test';
import { fakeD1 } from '../unit/d1-fake.js';
import { onRequestPost as subscribe, onRequestDelete as unsubscribe } from '../../functions/api/push/subscribe.js';
import { onRequestGet as getKey } from '../../functions/api/push/key.js';
import { b64u } from '../../server/push/webpush.js';

test('通知をオンにすると、時刻と種類だけがサーバーに登録される（名前は送らない）', async ({ context, page }) => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const env = { VAPID_PUBLIC_KEY: b64u.encode(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))), DB: fakeD1(new URL('../../server/schema.sql', import.meta.url).pathname) };
  const bodies = [];
  await context.route('**/api/push/**', async (route) => {
    const r = route.request(); const url = new URL(r.url());
    if (r.postData()) bodies.push(r.postData());
    const req = new Request(url, { method: r.method(), headers: r.headers(), body: ['POST', 'DELETE'].includes(r.method()) ? r.postData() : undefined });
    const res = url.pathname.endsWith('/key') ? await getKey({ env }) : r.method() === 'DELETE' ? await unsubscribe({ request: req, env }) : await subscribe({ request: req, env });
    await route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: await res.text() });
  });
  await context.grantPermissions(['notifications']);
  await page.addInitScript(() => {
    let sub = null;
    const p256dh = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
    window.PushManager.prototype.getSubscription = async () => sub;
    window.PushManager.prototype.subscribe = async (opts) => {
      if (!(opts.applicationServerKey instanceof Uint8Array) || opts.applicationServerKey.length !== 65) throw new Error('bad key');
      sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint', toJSON() { return { endpoint: this.endpoint, keys: { p256dh, auth: 'BTBZMqHH6r4Tts7J_aSIgg' } }; }, async unsubscribe() { sub = null; return true; } };
      return sub;
    };
  });
  await page.goto('/products/oshi-techo/');
  await page.getByLabel('推しの名前').fill('ヒミツの推し');
  await page.getByRole('button', { name: 'はじめる' }).click();
  await page.getByRole('link', { name: '当落' }).click();
  await page.getByRole('button', { name: '＋ 申し込んだチケットを記録' }).click();
  await page.getByLabel('公演・申込名').fill('秘密の公演名');
  const day = (n) => page.evaluate((k) => { const d = new Date(); d.setDate(d.getDate() + k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }, n);
  await page.getByLabel('当落発表日').fill(await day(3));
  await page.getByRole('button', { name: '保存' }).click();
  await page.getByRole('link', { name: '設定' }).click();
  await page.getByRole('button', { name: 'オンにする' }).click();
  await expect(page.getByText(/✅ オン/)).toBeVisible();
  expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM reminders').first()).n).toBe(1);
  // 当選にして入金期限を入れると、予定が自動で更新される
  await page.getByRole('link', { name: '当落' }).click();
  await page.getByLabel('秘密の公演名の入金期限').fill(await day(5));
  await page.getByRole('button', { name: '🎉 当選' }).click();
  await expect.poll(async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM reminders WHERE kind = 'pay'").first()).n).toBe(2);
  // サーバーに送ったデータに、推しの名前やチケット名は入っていない
  expect(bodies.join('\n')).not.toContain('秘密の公演名');
  expect(bodies.join('\n')).not.toContain('ヒミツの推し');
  // オフにすると購読ごと消える
  await page.getByRole('link', { name: '設定' }).click();
  await page.getByRole('button', { name: 'オフにする' }).click();
  await expect.poll(async () => (await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs').first()).n).toBe(0);
});

test('通知サーバーがないサイトでは、分かりやすく断る', async ({ page }) => {
  await page.goto('/products/oshi-techo/');
  await page.getByLabel('推しの名前').fill('A');
  await page.getByRole('button', { name: 'はじめる' }).click();
  await page.getByRole('link', { name: '設定' }).click();
  await page.getByRole('button', { name: 'オンにする' }).click();
  await expect(page.getByText(/通知サーバーがありません|対応していません/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'オンにする' })).toBeVisible();
});

test('Service Worker: push を受けると通知を出し、外部URLへは飛ばさない', async ({ context, page }) => {
  await context.grantPermissions(['notifications']);
  await page.goto('/index.html');
  const sw = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const result = await sw.evaluate(async () => {
    const shown = [];
    // ヘッドレスの Chromium には通知センターがないので、表示しようとした内容を記録する
    self.registration.showNotification = async (title, opts) => { shown.push({ title, body: opts.body, url: opts.data?.url }); };
    const fire = (data) => new Promise((res) => {
      const ev = new PushEvent('push', { data: JSON.stringify(data) });
      const waits = []; ev.waitUntil = (p) => waits.push(p);
      self.dispatchEvent(ev); Promise.all(waits).then(res, res);
    });
    await fire({ title: '🎫 テスト', body: 'こんにちは', url: 'products/oshi-techo/#tickets' });
    await fire({ title: 'x'.repeat(500), url: 'https://evil.example/phish' });
    return shown;
  });
  expect(result.length).toBe(2);
  const [a, b] = result.sort((x, y) => x.title.length - y.title.length);
  expect(a.title).toBe('🎫 テスト'); expect(a.url).toMatch(/\/products\/oshi-techo\/#tickets$/);
  expect(b.title.length).toBe(80); // 長すぎる題名は切る
  expect(b.url).not.toContain('evil.example'); // 外部URLはサイトのトップに置き換え
});
