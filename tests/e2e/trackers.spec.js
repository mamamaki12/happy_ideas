// 記録・タイマー・家族・お金系アプリの操作テスト
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

test('出かける前チェック: 全部押すと記録が残る', async ({ page }) => {
  await openApp(page, 'leave-check');
  for (const b of await page.locator('.check-item').all()) await b.click();
  await expect(page.getByText(/最後の確認:/)).toBeVisible();
});

test('お薬リマインダー: 登録して飲んだを押す', async ({ page }) => {
  await openApp(page, 'med-reminder');
  await page.getByLabel('名前').fill('ビタミン');
  await page.getByLabel('時刻（カンマ区切り）').fill('00:00, 23:59');
  await page.getByRole('button', { name: '登録' }).click();
  await expect(page.getByText(/今日のお薬（0\/2）/)).toBeVisible();
  await page.getByRole('button', { name: '飲んだ' }).first().click();
  await expect(page.getByText(/今日のお薬（1\/2）/)).toBeVisible();
});

test('お薬リマインダー: 不正な時刻はエラー', async ({ page }) => {
  await openApp(page, 'med-reminder');
  await page.getByLabel('名前').fill('A');
  await page.getByLabel('時刻（カンマ区切り）').fill('朝');
  await page.getByRole('button', { name: '登録' }).click();
  await expect(page.getByText('時刻を 08:00 の形で入れてください')).toBeVisible();
});

test('水分補給: ボタンで量が増える', async ({ page }) => {
  await openApp(page, 'water-log');
  await page.getByRole('button', { name: '+250ml' }).click();
  await page.getByRole('button', { name: '+150ml' }).click();
  await expect(page.locator('.big-number')).toHaveText('400 ml');
});

test('呼吸ガイド: 開始すると円が動く', async ({ page }) => {
  await openApp(page, 'breathing');
  await page.getByRole('button', { name: '▶ はじめる' }).click();
  await expect(page.locator('.breath-circle')).toHaveClass(/in/);
  await page.getByRole('button', { name: '■ やめる' }).click();
});

test('集中タイマー: 開始・停止', async ({ page }) => {
  await openApp(page, 'focus-timer');
  await page.getByLabel('いまやること').fill('資料作成');
  await page.getByRole('button', { name: '▶ 集中開始' }).click();
  await expect(page.getByText('集中中「資料作成」')).toBeVisible();
  await page.getByRole('button', { name: '■ やめる' }).click();
});

test('目の休憩: 開始できる', async ({ page }) => {
  await openApp(page, 'eye-break');
  await page.getByRole('button', { name: '▶ 開始' }).click();
  await expect(page.locator('.big-number')).toHaveText(/19:5\d|20:00/);
});

test('スマホ見た回数: 理由を選ぶと記録される', async ({ page }) => {
  await openApp(page, 'pickup-counter');
  await page.getByRole('button', { name: '🌀 なんとなく' }).click();
  await expect(page.locator('.big-number')).toHaveText('1 回');
});

test('推し活ノート: 記録すると年間合計が出る', async ({ page }) => {
  await openApp(page, 'oshi-log');
  await page.getByLabel('金額').fill('9800');
  await page.getByRole('button', { name: '記録', exact: true }).click();
  await expect(page.locator('.big-number')).toHaveText('9,800円');
});

test('推しカウントダウン: 予定を入れると日数が出る', async ({ page }) => {
  await openApp(page, 'oshi-countdown');
  await page.getByLabel('なに').fill('ドーム公演');
  const d = new Date(); d.setDate(d.getDate() + 10);
  await page.getByLabel('いつ').fill(d.toISOString().slice(0, 10));
  await page.getByRole('button', { name: '追加' }).click();
  await expect(page.locator('.countdown-hero .big-number')).toHaveText(/^(9|10|11)$/);
});

test('ペンライト: 光らせてタップで戻る', async ({ page }) => {
  await openApp(page, 'penlight');
  await page.getByRole('button', { name: '✨ 光らせる' }).click();
  await expect(page.locator('.pen-stage')).toBeVisible();
  await page.locator('.pen-stage').click();
  await expect(page.locator('.pen-stage')).toBeHidden();
});

test('応援ボード: 文字がプレビューに出る', async ({ page }) => {
  await openApp(page, 'cheer-board');
  await page.getByLabel('文字', { exact: true }).fill('手を振って');
  await expect(page.locator('.board-preview .board-text')).toHaveText('手を振って');
});

test('セトリ予想: 答え合わせで点数', async ({ page }) => {
  await openApp(page, 'setlist');
  await page.getByLabel('新しいライブ').fill('ツアー');
  await page.getByRole('button', { name: '作成' }).click();
  await page.getByLabel('🔮 予想').fill('A\nB\nC');
  await page.getByLabel('🎤 実際').fill('A\nC\nB');
  await expect(page.locator('.big-number')).toHaveText('55点');
});

test('わたしの棚: 並べると背表紙が増える', async ({ page }) => {
  await openApp(page, 'shelf');
  await page.getByLabel('読んだ・観た・聴いたもの').fill('すごい本');
  await page.getByRole('button', { name: '並べる' }).click();
  await expect(page.locator('.spine')).toHaveCount(1);
});

test('お題カード: めくるとお題が出る', async ({ page }) => {
  await openApp(page, 'icebreaker');
  await page.getByRole('button', { name: '次のお題' }).click();
  await expect(page.locator('.ice-card')).not.toHaveText('タップしてお題をめくる');
});

test('ありがとうカード: 送ると画像を保存', async ({ page }) => {
  await openApp(page, 'thanks-card');
  await page.getByLabel('メッセージ').fill('助かりました');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '💌 送る / 保存' }).click()]);
  expect(dl.suggestedFilename()).toBe('thanks.png');
});

test('げんきボタン: 押すと今日の記録が付く', async ({ page }) => {
  await openApp(page, 'checkin');
  await page.getByRole('button', { name: /元気です/ }).click();
  await expect(page.getByText(/今日は .* に送りました/)).toBeVisible();
  await expect(page.getByText('連続 1 日')).toBeVisible();
});

test('誕生日ノート: 登録すると日数が出る', async ({ page }) => {
  await openApp(page, 'birthday');
  await page.getByLabel('名前').fill('母');
  await page.getByLabel('誕生日').fill('1960-12-24');
  await page.getByRole('button', { name: '登録' }).click();
  await expect(page.getByText(/あと\d+日|今日/)).toBeVisible();
});

test('防災備蓄: 量を入れると達成数が変わる', async ({ page }) => {
  await openApp(page, 'bousai-stock');
  await page.getByLabel(/飲料水の今ある量/).fill('100');
  await page.getByLabel(/飲料水の今ある量/).blur();
  await expect(page.getByText(/備蓄チェック（1\//)).toBeVisible();
});

test('SOSライト: 発信してタップで止まる', async ({ page }) => {
  await openApp(page, 'sos-light');
  await page.getByLabel('ライト').uncheck();
  await page.getByRole('button', { name: 'SOS', exact: true }).click();
  await expect(page.locator('.sos-flash')).toBeVisible();
  await page.locator('.sos-flash').click();
  await expect(page.locator('.sos-flash')).toBeHidden();
});

test('緊急連絡カード: 入力内容がカードに出る', async ({ page }) => {
  await openApp(page, 'emergency-card');
  await page.getByLabel('名前', { exact: true }).fill('山田花子');
  await page.getByLabel('緊急連絡先1（名前・続柄・電話）').fill('山田太郎 夫 090-1234-5678');
  await page.getByRole('button', { name: '🆘 カードを表示' }).click();
  await expect(page.locator('.ec-view')).toContainText('山田花子');
  await expect(page.getByRole('link', { name: '📞 電話' })).toHaveAttribute('href', 'tel:09012345678');
});

test('夜道おまもり: 偽の着信画面', async ({ page }) => {
  await openApp(page, 'fake-call');
  await page.getByLabel('タイミング').selectOption('0');
  await page.getByRole('button', { name: '着信を予約' }).click();
  await expect(page.locator('.call-name')).toHaveText('お母さん');
  await page.getByRole('button', { name: '応答' }).click();
  await page.getByRole('button', { name: '通話終了' }).click();
  await expect(page.locator('.call')).toBeHidden();
});

test('停電モード: 真っ黒表示に切り替わる', async ({ page }) => {
  await openApp(page, 'power-outage');
  await page.getByRole('button', { name: /真っ黒表示/ }).click();
  await expect(page.locator('body')).toHaveClass(/blackout/);
});

test('暗記カード: めくって評価すると次へ進む', async ({ page }) => {
  await openApp(page, 'flashcards');
  await expect(page.getByText('残り 3 枚')).toBeVisible();
  await page.getByRole('button', { name: 'タップで裏返す' }).click();
  await page.getByRole('button', { name: '😊 覚えた' }).click();
  await expect(page.getByText('残り 2 枚')).toBeVisible();
});

test('なぞり書き: 書いて採点', async ({ page }) => {
  await openApp(page, 'kanji-pad');
  const box = await page.locator('canvas.pad').boundingBox();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await page.getByRole('button', { name: '💮 できた' }).click();
  await expect(page.getByText(/\d+点/)).toBeVisible();
});

test('発言時間タイマー: タップした人の時間が進む', async ({ page }) => {
  await openApp(page, 'meeting-timer');
  await page.getByRole('button', { name: /Aさん/ }).click();
  await page.waitForTimeout(1200);
  await expect(page.getByRole('button', { name: /Aさん/ })).toContainText('00:01');
});

test('タイピング: 正しく打つと進む', async ({ page }) => {
  await openApp(page, 'typing');
  const kana = await page.locator('.type-kana').textContent();
  const first = kana[0];
  const map = { 'き': 'k', 'ち': 'c', 'あ': 'a', 'お': 'o', 'れ': 'r', 'し': 's', 'え': 'e', 'ゆ': 'y' };
  await page.keyboard.press(map[first] || 'a');
  await expect(page.locator('.type-roma .done')).not.toHaveText('');
});

test('習慣トラッカー: 今日やったを押すと今週1回', async ({ page }) => {
  await openApp(page, 'habit');
  await page.getByRole('button', { name: '散歩するを今日やった' }).click();
  await expect(page.getByText(/今週 1\/4 回/)).toBeVisible();
});

test('1分まなび: 3枚読むと今日はおしまい', async ({ page }) => {
  await openApp(page, 'micro-learn');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '読んだ ✓' }).click();
  await expect(page.getByText(/今日の3枚はおしまい/)).toBeVisible();
});

test('通貨換算: テンキーで換算', async ({ page }) => {
  await openApp(page, 'currency');
  for (const k of ['1', '0']) await page.getByRole('button', { name: k, exact: true }).click();
  await expect(page.locator('.cur-out')).toHaveText('≈ 1,500 円');
});

test('旅の一行日記: 旅を作って記録', async ({ page }) => {
  await openApp(page, 'trip-journal');
  await page.getByLabel('新しい旅の名前').fill('京都');
  await page.getByRole('button', { name: '新しい旅' }).click();
  await page.getByLabel('ひとこと').fill('抹茶パフェ');
  await page.getByRole('button', { name: '📍 記録' }).click();
  await expect(page.locator('.timeline li')).toHaveCount(1);
  await expect(page.getByRole('link', { name: '📍地図' })).toBeVisible();
});

test('持ち物リスト: 海外を選ぶとパスポートが出る', async ({ page }) => {
  await openApp(page, 'packing');
  await page.getByRole('button', { name: '✈️ 海外' }).click();
  await expect(page.getByLabel('パスポート')).toBeVisible();
  await page.getByLabel('パスポート').check();
  await expect(page.getByText(/持ち物（1\//)).toBeVisible();
});

test('サ活記録: サウナ→水風呂→休憩→終了', async ({ page }) => {
  await openApp(page, 'sauna-log');
  await page.getByRole('button', { name: '🔥 サウナ' }).click();
  await page.getByRole('button', { name: '🧊 水風呂' }).click();
  await page.getByRole('button', { name: 'ととのい度5で終了' }).click();
  await expect(page.getByText(/1セット/)).toBeVisible();
});

test('ペット手帳: 体重を記録', async ({ page }) => {
  await openApp(page, 'pet-log');
  await page.getByLabel('内容').fill('5.2');
  await page.getByRole('button', { name: '記録', exact: true }).click();
  await expect(page.getByText(/最新 5.2kg/)).toBeVisible();
});

test('育児記録: おむつを押すと今日の回数が増える', async ({ page }) => {
  await openApp(page, 'baby-log');
  await page.getByRole('button', { name: '💧 おしっこ' }).click();
  await expect(page.getByText(/おしっこ 1/)).toBeVisible();
});

test('おてつだいポイント: 貯めて交換', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await openApp(page, 'chore-points');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: /おさらはこび/ }).click();
  await expect(page.locator('.big-number')).toHaveText('⭐ 5');
  await page.getByRole('button', { name: /テレビ30分/ }).click();
  await expect(page.locator('.big-number')).toHaveText('⭐ 0');
});

test('成長きろく: 2回記録するとのびが出る', async ({ page }) => {
  await openApp(page, 'growth-chart');
  await page.getByLabel('日付').fill('2025-10-01'); await page.getByLabel('身長', { exact: true }).fill('100'); await page.getByRole('button', { name: '記録', exact: true }).click();
  await page.getByLabel('日付').fill('2026-10-01'); await page.getByLabel('身長', { exact: true }).fill('106.5'); await page.getByRole('button', { name: '記録', exact: true }).click();
  await expect(page.getByText('+6.5cm')).toBeVisible();
});

test('介護ノート: 記録がまとめに反映', async ({ page }) => {
  await openApp(page, 'care-log');
  await page.getByLabel('体温（℃）').fill('37.2');
  await page.locator('form', { has: page.getByLabel('体温（℃）') }).getByRole('button').click();
  await page.getByRole('button', { name: '💧 排尿' }).click();
  await expect(page.locator('.care-sum')).toContainText('体温: 平均 37.2℃');
  await expect(page.locator('.care-sum')).toContainText('排尿 1回');
});

test('ポイント期限帳: 失効が近いと警告', async ({ page }) => {
  await openApp(page, 'point-expiry');
  await page.getByLabel('名前').fill('Aポイント');
  await page.getByLabel('残高').fill('1200');
  const d = new Date(); d.setDate(d.getDate() + 5);
  await page.getByLabel('失効日').fill(d.toISOString().slice(0, 10));
  await page.getByRole('button', { name: '登録' }).click();
  await expect(page.locator('.pill.danger')).toBeVisible();
});

test('旅行予算: 支出を入れると残りが減る', async ({ page }) => {
  await openApp(page, 'trip-budget');
  await page.getByLabel('金額').fill('3000');
  await page.getByRole('button', { name: '記録', exact: true }).click();
  await expect(page.locator('.big-number')).toHaveText('47,000円');
});

test('リズムタップ: スタートできる', async ({ page }) => {
  await openApp(page, 'rhythm-tap');
  await page.getByRole('button', { name: '▶ スタート' }).click();
  await expect(page.getByRole('button', { name: 'タップ' })).toBeEnabled();
});
