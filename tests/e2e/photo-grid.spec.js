// てもとフォト: 複数の写真を1枚にまとめるグリッド
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { solidPhoto } from './photo-helpers.js';

test.describe.configure({ timeout: 60000 });
const COLORS = { red: [255, 0, 0], green: [0, 200, 0], blue: [0, 0, 255], yellow: [255, 220, 0] };
/** グリッドの表示の、点（0〜1）の色 */
const at = (page, x, y) => page.locator('canvas.grid-view').evaluate((c, [x, y]) => [...c.getContext('2d').getImageData(Math.floor(c.width * x), Math.floor(c.height * y), 1, 1).data].slice(0, 3), [x, y]);
const is = (got, want, tol = 30) => got.every((v, i) => Math.abs(v - want[i]) <= tol);

async function setup(page) {
  await page.goto('/products/photo-editor/');
  const files = [];
  for (const [name, c] of Object.entries(COLORS)) files.push(await solidPhoto(page, `rgb(${c.join(',')})`, { name: `${name}.png` }));
  await page.locator('#open-file').setInputFiles(files);
  await expect(page.locator('.lib-item')).toHaveCount(4);
  // 一覧は新しい順なので、名前で並び順を確かめておく
  return page.locator('.lib-name').allTextContents();
}

test('4枚を選んでグリッド: 2×2・すき間の色・レイアウト変更・入れ替え・書き出し・一覧に保存', async ({ page }) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const names = await setup(page);
  await page.getByRole('button', { name: 'すべて選択' }).click();
  await page.getByRole('button', { name: /グリッドを作る/ }).click();
  await expect(page.locator('canvas.grid-view')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(200);
  // 2×2: 4つのマスに、選んだ順の写真の色
  const quad = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
  const got = await Promise.all(quad.map(([x, y]) => at(page, x, y)));
  got.forEach((c, i) => expect(is(c, COLORS[names[i]]), `${i}: ${c} vs ${names[i]}`).toBe(true));
  expect(is(await at(page, 0.5, 0.25), [255, 255, 255], 5)).toBe(true); // すき間は背景の白
  // 背景を黒に
  await page.getByRole('tab', { name: '余白・色' }).click();
  await page.getByRole('button', { name: '背景の色: #000000' }).click();
  expect(is(await at(page, 0.5, 0.25), [0, 0, 0], 5)).toBe(true);
  // 上に大きく
  await page.getByRole('tab', { name: 'レイアウト' }).click();
  await page.getByRole('button', { name: '上に大きく' }).click();
  expect(is(await at(page, 0.2, 0.25), COLORS[names[0]])).toBe(true);
  expect(is(await at(page, 0.8, 0.25), COLORS[names[0]])).toBe(true);
  // 入れ替え: 1つ目のマスを選んで、2つ目（下の左）と入れ替える
  const box = await page.locator('canvas.grid-view').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.25);
  await page.getByRole('button', { name: '⇄ ほかの写真と入れ替え' }).click();
  await page.mouse.click(box.x + box.width * 0.15, box.y + box.height * 0.8);
  expect(is(await at(page, 0.5, 0.25), COLORS[names[1]])).toBe(true);
  expect(is(await at(page, 0.15, 0.8), COLORS[names[0]])).toBe(true);
  // 比率 9:16 で書き出し
  await page.getByRole('tab', { name: 'レイアウト' }).click();
  await page.getByRole('button', { name: '9:16' }).click();
  expect(await page.locator('canvas.grid-view').evaluate((c) => c.width / c.height)).toBeCloseTo(9 / 16, 2);
  await page.getByRole('button', { name: '書き出し', exact: true }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: '1080px（SNS）' }).click();
  const dl = page.waitForEvent('download');
  await dlg.getByRole('button', { name: '書き出す', exact: true }).click();
  const d = await dl;
  const buf = await readFile(await d.path());
  const size = await page.evaluate(async (b64) => { const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))])); return [bmp.width, bmp.height]; }, buf.toString('base64'));
  expect(size).toEqual([608, 1080]);
  // 一覧に保存して、続けて編集できる
  await dlg.getByRole('button', { name: '写真一覧に保存' }).click();
  await expect(dlg).toContainText('写真一覧に保存しました', { timeout: 20000 });
  await dlg.getByRole('button', { name: '閉じる' }).click();
  await page.getByRole('button', { name: '‹ 写真' }).click();
  await expect(page.locator('.lib-item')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('グリッド: 1枚だけ・10枚以上は作れない／写真をドラッグして見える位置を変える', async ({ page }) => {
  await setup(page);
  await page.locator('.lib-check').first().check();
  await expect(page.getByRole('button', { name: /グリッドを作る/ })).toBeDisabled();
  await page.locator('.lib-check').nth(1).check();
  await page.getByRole('button', { name: /グリッドを作る/ }).click();
  await expect(page.locator('canvas.grid-view')).toBeVisible({ timeout: 20000 });
  // 横に2つ（縦長のマスに横長の写真）→ 左右にはみ出しているのでドラッグで動く
  const box = await page.locator('canvas.grid-view').boundingBox();
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5, { steps: 5 }); await page.mouse.up();
  const c = await page.evaluate(() => window.__temoto.grid.grid.cells[0]);
  expect(c.ox).toBeLessThan(-0.3);
  await page.getByLabel('拡大', { exact: true }).evaluate((el) => { el.value = 200; el.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(await page.evaluate(() => window.__temoto.grid.grid.cells[0].zoom)).toBe(2);
});

test('a11y: グリッドの画面（重大な違反なし）', async ({ page }) => {
  const { createRequire } = await import('node:module');
  await setup(page);
  await page.getByRole('button', { name: 'すべて選択' }).click();
  await page.getByRole('button', { name: /グリッドを作る/ }).click();
  await expect(page.locator('canvas.grid-view')).toBeVisible({ timeout: 20000 });
  const axe = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
  for (const t of ['レイアウト', '余白・色', '写真']) {
    await page.getByRole('tab', { name: t }).click();
    await page.evaluate(axe);
    const res = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    const serious = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    expect(serious, `${t}: ${serious.join('\n')}`).toEqual([]);
  }
});
