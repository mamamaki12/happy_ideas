# happy_ideas

Webブラウザの機能（カメラ・通知・位置情報・センサー・マイク・音声認識など）を使った**100個のアプリアイデア**と、その**動く試作**を集めたリポジトリです。

- 📊 市場調査: [`docs/market-research.md`](docs/market-research.md)
- 💡 アイデア100: [`ideas/IDEAS.md`](ideas/IDEAS.md)
- 🔬 機能ごとの実現性レポート: [`docs/feasibility.md`](docs/feasibility.md)
- 📝 開発メモ: [`docs/NOTES.md`](docs/NOTES.md)

## 動かし方

```bash
npm install          # テスト用（Playwright）だけ
npm run build        # 各アプリの index.html とアイデア一覧を生成
npm run serve        # http://localhost:4173 で開く
```

カメラ・マイク・位置情報は **HTTPS または localhost** でしか動きません。スマホで試す場合は GitHub Pages などHTTPSで配信してください。

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
