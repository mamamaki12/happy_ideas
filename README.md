# happy_ideas

Webブラウザの機能（カメラ・通知・位置情報・センサー・マイク・音声認識・WebRTC など）を使った**100個のアプリアイデア**と、その**動く試作100個**、さらに **Claude API を使うAIアプリ10個**を集めたリポジトリです（合計110個）。

- 試作はすべてアカウント不要・外部ライブラリなし。AIアプリ以外は端末内保存だけ
- 実現性の判定: Webだけで製品にできる 60 ／ 制約あり 43（AIアプリ10を含む） ／ 技術検証どまり 7
- テスト: 単体 97件、E2E 497件（全試作の起動・操作・XSSファズ・アクセシビリティ・AI中継）

- ㊞ **製品版: ラリーメーカー** → [`products/rally/`](products/rally/)（競合調査後の1位。サーバーなしの位置情報スタンプラリー）
- 📔 **製品版: 推し活手帳** → [`products/oshi-techo/`](products/oshi-techo/)（2位。支出・当落・予定・写真・年間まとめ）
- 📷 **てもとフォト（写真編集）** → [`products/photo-editor/`](products/photo-editor/)（写真を端末の外に出さずに編集。一般的な写真編集アプリとの比較は [`docs/photo-editor.md`](docs/photo-editor.md)）
- 🤖 **Claude API を使うアプリ10個** → [`docs/ai-apps.md`](docs/ai-apps.md)（中継サーバー・回数制限・プロンプトインジェクション対策。サーバー未設定ならデモ表示）
- ⚔ 競合調査: [`docs/competition.md`](docs/competition.md)
- 🚀 公開と検証のプラン: [`docs/launch-plan.md`](docs/launch-plan.md)
- 📊 市場調査: [`docs/market-research.md`](docs/market-research.md)
- 💡 アイデア100: [`ideas/IDEAS.md`](ideas/IDEAS.md)
- 🔬 機能ごとの実現性レポート: [`docs/feasibility.md`](docs/feasibility.md)（試作ごと: [`docs/feasibility-apps.md`](docs/feasibility-apps.md)）
- 🏆 おすすめの次の一手: [`docs/recommendations.md`](docs/recommendations.md)
- 🔒 セキュリティ: [`docs/security.md`](docs/security.md)
- 📝 開発メモ: [`docs/NOTES.md`](docs/NOTES.md)

## 動かし方

```bash
npm install          # テスト用（Playwright）だけ
npm run build        # 各アプリの index.html とアイデア一覧を生成
npm run serve        # http://localhost:4173 で開く
```

カメラ・マイク・位置情報は **HTTPS または localhost** でしか動きません。スマホで試す場合は GitHub Pages などHTTPSで配信してください。

## スマホで試す（GitHub Pages で公開）

カメラ・位置情報・マイクは HTTPS が必要なので、GitHub Pages で公開するとスマホでそのまま試せます。

1. GitHub のリポジトリで **Settings → Pages → Build and deployment → Source** を **「GitHub Actions」** にする
2. このブランチを `main` にマージする（または Actions タブから「Deploy to GitHub Pages」を手動実行）
3. テストが通ると `https://<ユーザー名>.github.io/happy_ideas/` に公開される

iPhone で通知を試すときは、Safari の共有ボタンから「ホーム画面に追加」してから開いてください。

### 参加人数の集計も使う場合（Cloudflare Pages）

ラリーメーカーの「参加状況」（参加・完走の人数）は、小さなサーバー（Cloudflare Pages Functions + D1）があるときだけ動きます。GitHub Pages では自動的にオフになり、それ以外の機能はそのまま使えます。

1. Cloudflare Pages でこのリポジトリをつなぎ、ビルドコマンド `npm run site`、出力ディレクトリ `_site`
2. `npx wrangler d1 create happy-ideas` → `wrangler.toml` に database_id を記入
3. `npx wrangler d1 execute happy-ideas --remote --file=server/schema.sql`
4. Pages の設定で D1 バインディング `DB` を追加

集計APIのコードは [`functions/api/rally/`](functions/api/rally/)、テストは `tests/unit/rally-api.test.js`（本物のSQLiteで実行）。

推し活手帳の**サーバー通知**も同じ D1 を使います。`node scripts/vapid-keys.mjs` で鍵を作り、Pages の環境変数に `VAPID_PUBLIC_KEY`、通知送信用 Worker（[`wrangler.push.toml`](wrangler.push.toml)、15分ごとのCron）に公開鍵・秘密鍵を `wrangler secret` で登録します。

## チェック

```bash
npm run security     # 静的セキュリティチェック（CSP・innerHTML禁止など）
npm run unit         # ロジックの単体テスト
npx playwright test  # 全試作の起動・操作テスト（スマホ幅のChromium）
npm run check        # 上記すべて
```

## 構成

```
index.html, gallery.*   ギャラリー（トップページ）
ideas/ideas.js          100アイデアのデータ（唯一の元データ）
apps/<slug>/app.js      各試作（index.html は build で生成）
shared/lib.js           共通ユーティリティ（DOM組み立て・保存・通知・カメラ・位置情報…）
shared/style.css        共通スタイル（ライト/ダーク対応）
sw.js                   オフライン対応・通知用 Service Worker
scripts/                生成スクリプト・セキュリティチェック
tests/                  単体テスト・E2Eテスト
```
