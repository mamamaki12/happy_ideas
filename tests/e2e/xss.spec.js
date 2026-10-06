// セキュリティ: 全アプリのテキスト入力欄に XSS ペイロードを入れて送信し、スクリプトが実行されない・HTMLとして解釈されないことを確認
import { test, expect } from '@playwright/test';
import { BUILT } from '../../ideas/built.js';

const PAYLOAD = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>"\'><svg onload="window.__xss=1">';

for (const slug of BUILT) {
  test(`${slug}: XSSペイロードが実行されない`, async ({ page }) => {
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
    const cspViolations = [];
    page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) cspViolations.push(m.text()); });
    await page.goto(`/apps/${slug}/`);
    await page.waitForTimeout(200);
    const inputs = page.locator('input[type=text], input:not([type]), input[type=search], textarea');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const el = inputs.nth(i);
      if (!(await el.isVisible()) || !(await el.isEditable())) continue;
      await el.fill(PAYLOAD).catch(() => {});
      await el.press('Enter').catch(() => {});
    }
    // 送信ボタンも押してみる
    for (const b of await page.locator('form button[type=submit]').all()) if (await b.isVisible() && await b.isEnabled()) await b.click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(await page.locator('img[src="x"], svg[onload], #app script').count()).toBe(0);
    // confirm ダイアログ（削除確認など）以外のダイアログは出ない
    expect(dialogs.filter((m) => !/削除|交換/.test(m))).toEqual([]);
    expect(cspViolations).toEqual([]);
  });
}
