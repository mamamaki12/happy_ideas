// アクセシビリティ: 全ページを axe-core で検査（重大・深刻な違反がないこと）
import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { BUILT } from '../../ideas/built.js';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
test.use({ bypassCSP: true }); // 検査スクリプトを注入するためだけに CSP を外す（アプリ自体の CSP は smoke/xss テストで確認済み）

const PAGES = ['index.html', ...BUILT.map((s) => `apps/${s}/`), 'products/oshi-techo/', 'products/rally/', 'products/privacy.html'];

for (const path of PAGES) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.route('https://api.open-meteo.com/**', (r) => r.abort());
    await page.goto(`/${path}`);
    await page.waitForTimeout(300);
    await page.addScriptTag({ path: axePath });
    const res = await page.evaluate(async () => window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    }));
    const serious = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
      .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} [${(n.any[0]?.data?.contrastRatio ?? '')} ${n.any[0]?.data?.fgColor ?? ''}/${n.any[0]?.data?.bgColor ?? ''}]`).join(' | ')}`);
    expect(serious, serious.join('\n')).toEqual([]);
  });
}
