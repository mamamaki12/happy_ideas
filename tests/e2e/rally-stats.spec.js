// ラリーメーカー × 集計API: 本物の Pages Functions のコード（D1 は SQLite の偽物）をブラウザの通信につないで検証
import { test, expect } from '@playwright/test';
import jsQR from 'jsqr';
import { fakeD1 } from '../unit/d1-fake.js';
import { onRequestPost as register } from '../../functions/api/rally/index.js';
import { onRequestPost as event } from '../../functions/api/rally/[id]/event.js';
import { onRequestGet as stats } from '../../functions/api/rally/[id]/stats.js';
import { readQr, gotoFresh } from './helpers.js';

async function attachApi(context) {
  const env = { DB: fakeD1(new URL('../../server/schema.sql', import.meta.url).pathname) };
  await context.route('**/api/rally**', async (route) => {
    try { await handle(route); } catch (e) { console.log('API handler error', e); await route.fulfill({ status: 500, body: String(e) }); }
  });
  async function handle(route) {
    const r = route.request();
    const url = new URL(r.url());
    const req = new Request(url, { method: r.method(), headers: r.headers(), body: ['POST', 'PUT'].includes(r.method()) ? r.postData() : undefined });
    const m = url.pathname.match(/\/api\/rally(?:\/([^/]+)\/(event|stats))?$/);
    let res;
    if (!m) res = new Response('not found', { status: 404 });
    else if (!m[1] && r.method() === 'POST') res = await register({ request: req, env });
    else if (m[2] === 'event' && r.method() === 'POST') res = await event({ request: req, env, params: { id: m[1] } });
    else if (m[2] === 'stats' && r.method() === 'GET') res = await stats({ request: req, env, params: { id: m[1] } });
    else res = new Response('method not allowed', { status: 405 });
    const text = await res.text();
    if (process.env.DEBUG_API) console.log(r.method(), url.pathname, res.status, text.slice(0, 120));
    await route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: text });
  }
}

test('集計サーバーがあると、参加・スタンプ・完走が主催者の画面に出る', async ({ browser }) => {
  test.setTimeout(60000);
  const opts = { permissions: ['geolocation', 'clipboard-read', 'clipboard-write'], geolocation: { latitude: 35.681236, longitude: 139.767125, accuracy: 10 }, locale: 'ja-JP', timezoneId: 'Asia/Tokyo' };
  const organizer = await browser.newContext(opts); await attachApi(organizer);
  const page = await organizer.newPage();
  await page.goto('/products/rally/');
  await page.getByLabel('ラリーの名前').fill('集計テスト');
  await page.getByLabel('名前', { exact: true }).fill('A地点');
  await page.getByRole('button', { name: '📍 いまいる場所を追加' }).click();
  await page.getByRole('button', { name: '参加用のURLとQRを作る' }).click();
  await expect(page.getByText('参加状況の集計がオンです')).toBeVisible();
  await page.getByRole('button', { name: '🔳 QRを表示' }).click();
  const url = await readQr(page, jsQR);
  await page.getByRole('button', { name: '閉じる' }).click();

  // 別の人（別のブラウザ）が参加する。サーバーは同じものを共有したいので、同じ context で別ページを使う
  for (let i = 0; i < 2; i++) {
    const p = await organizer.newPage();
    await p.addInitScript(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('happy:rally:st:') || k.startsWith('happy:rally:started:') || k === 'happy:rally:device') localStorage.removeItem(k); });
    await gotoFresh(p, url);
    if (i === 0) {
      await p.getByRole('button', { name: '📍 スタンプを押す' }).click();
      await expect(p.getByRole('heading', { name: 'COMPLETE!' })).toBeVisible();
    } else await expect(p.getByRole('button', { name: '📍 スタンプを押す' })).toBeVisible();
    await p.waitForTimeout(300);
    await p.close();
  }
  await page.reload();
  await page.getByRole('button', { name: '最新にする' }).click();
  await expect(page.locator('.stat').nth(0)).toContainText('2'); // 参加
  await expect(page.locator('.stat').nth(1)).toContainText('1'); // 完走
  await expect(page.locator('.stat').nth(2)).toContainText('50%');
  await expect(page.locator('.list li', { hasText: 'A地点' })).toContainText('1人');
  await organizer.close();
});

test('集計サーバーがない（GitHub Pages など）と、集計なしで公開できる', async ({ page }) => {
  await page.goto('/products/rally/');
  await page.getByLabel('名前', { exact: true }).fill('A');
  await page.getByRole('button', { name: '📍 いまいる場所を追加' }).click();
  await page.getByRole('button', { name: '参加用のURLとQRを作る' }).click();
  await expect(page.getByText('集計サーバーがないため')).toBeVisible();
  await expect(page.getByRole('heading', { name: '📊 参加状況' })).toHaveCount(0);
});
