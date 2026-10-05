// マイク・音声合成・音声認識を使うアプリの操作テスト
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

/** 音声認識をテスト用の偽物に差し替える（指定した文を認識したことにする） */
async function fakeRecognition(page, transcript) {
  await page.addInitScript((text) => {
    class FakeSR {
      start() {
        setTimeout(() => {
          const res = [{ 0: { transcript: text }, isFinal: true, length: 1 }];
          this.onresult?.({ resultIndex: 0, results: res });
          this.onend?.();
        }, 100);
      }
      stop() { this.onend?.(); }
    }
    window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
  }, transcript);
}

test('騒音メーター: マイクからdBが出る', async ({ page }) => {
  await openApp(page, 'noise-meter');
  await page.getByRole('button', { name: '🎤 計測開始' }).click();
  await expect(page.locator('.big-number')).toHaveText(/^\d+ dB$/);
  await page.getByRole('button', { name: '■ 停止' }).click();
});

test('音程チェッカー: 偽マイクのビープ音の音程を検出', async ({ page }) => {
  await openApp(page, 'pitch-meter');
  await page.getByRole('button', { name: '🎤 はじめる' }).click();
  await expect(page.locator('.pitch-note')).not.toHaveText('--', { timeout: 10000 });
});

test('声の手紙: 録音すると一覧に出る', async ({ page }) => {
  await openApp(page, 'voice-letter');
  await page.getByLabel('だれに？').fill('おばあちゃんへ');
  await page.getByRole('button', { name: '録音開始' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '録音停止' }).click();
  await expect(page.locator('li', { hasText: 'おばあちゃんへ' })).toBeVisible();
  await expect(page.locator('audio')).toHaveCount(1);
});

test('寝言レコーダー: 開始と終了ができる', async ({ page }) => {
  await openApp(page, 'sleep-sound');
  await page.getByRole('button', { name: /おやすみ/ }).click();
  await expect(page.getByText(/待機中|録音中/)).toBeVisible();
  await page.getByRole('button', { name: /おはよう/ }).click();
  await expect(page.getByText('おはようございます。記録を確認しましょう。')).toBeVisible();
});

test('環境音: 再生と一時停止', async ({ page }) => {
  await openApp(page, 'white-noise');
  await page.getByRole('button', { name: '▶ 再生' }).click();
  await expect(page.getByRole('button', { name: '❚❚ 一時停止' })).toBeVisible();
  await page.getByLabel('🌧 雨音').fill('0.8');
  await page.getByRole('button', { name: '❚❚ 一時停止' }).click();
  await expect(page.getByRole('button', { name: '▶ 再生' })).toBeVisible();
});

test('声でToDo: 認識した文が複数のToDoになる', async ({ page }) => {
  await fakeRecognition(page, '牛乳を買う、それから銀行に行く');
  await openApp(page, 'voice-todo');
  await page.getByRole('button', { name: '話して追加' }).click();
  await expect(page.getByText('やること（2）')).toBeVisible();
  await page.getByLabel('牛乳を買うを完了').check();
  await expect(page.getByText('やること（1）')).toBeVisible();
});

test('声でToDo: 文字入力でも追加できる', async ({ page }) => {
  await openApp(page, 'voice-todo');
  await page.getByLabel('ToDoを文字で追加').fill('ゴミ出し');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await expect(page.getByText('やること（1）')).toBeVisible();
});

test('発音チェック: 認識結果から点数が出る', async ({ page }) => {
  await fakeRecognition(page, 'the weather is really nice today');
  await openApp(page, 'pronounce');
  await page.getByRole('button', { name: '🎤 読んでみる' }).click();
  await expect(page.locator('.big-number')).toHaveText('100点');
});

test('話すスピード計: フィラーを数える', async ({ page }) => {
  await fakeRecognition(page, 'えーと、本日はですね、あのー、よろしくお願いします');
  await openApp(page, 'speech-pace');
  await page.getByRole('button', { name: '🎤 話しはじめる' }).click();
  await expect(page.getByText('フィラー 2 回')).toBeVisible();
  await page.getByRole('button', { name: '■ 終了' }).click().catch(() => {});
});

test('指さし会話帳: タップすると大きく表示', async ({ page }) => {
  await openApp(page, 'phrase-board');
  await page.getByRole('tab', { name: '道案内' }).click();
  await page.getByRole('button', { name: /トイレはどこですか/ }).click();
  await expect(page.locator('.phrase-big')).toHaveText('Where is the restroom?');
  await page.getByRole('button', { name: '閉じる' }).click();
  await page.getByLabel('相手').selectOption('ko');
  await expect(page.getByText('화장실은 어디예요?')).toBeVisible();
});

test('読み聞かせ: 選ぶとお話が変わる', async ({ page }) => {
  await openApp(page, 'bedtime-story');
  await page.getByLabel('だれが').selectOption('ねこのタマ');
  await expect(page.locator('.story p').first()).toContainText('ねこのタマ');
});

test('ストレッチ: メニューを切り替えられる', async ({ page }) => {
  await openApp(page, 'stretch-coach');
  await page.getByLabel('メニュー').selectOption('sleep');
  await expect(page.locator('.steps li').first()).toContainText('仰向け');
});

test('シャドーイング: 言語を変えると文が変わる', async ({ page }) => {
  await openApp(page, 'shadowing');
  await page.getByLabel('言語').selectOption('ja-JP');
  await expect(page.getByLabel('練習する文')).toHaveValue(/駅/);
});
