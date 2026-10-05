# happy_ideas

Webブラウザの機能（カメラ・通知・位置情報・センサー・マイク・音声認識・WebRTC など）を使った**100個のアプリアイデア**と、その**動く試作100個**を集めたリポジトリです。

- 試作はすべてアカウント不要・端末内保存・外部ライブラリなし
- 実現性の判定: Webだけで製品にできる 60 ／ 制約あり 33 ／ 技術検証どまり 7
- テスト: 単体 51件、E2E 約310件（全試作の起動・操作・XSSファズ）

- ㊞ **製品版: ラリーメーカー** → [`products/rally/`](products/rally/)（競合調査後の1位。サーバーなしの位置情報スタンプラリー）
- 📔 **製品版: 推し活手帳** → [`products/oshi-techo/`](products/oshi-techo/)（2位。支出・当落・予定・写真・年間まとめ）
- ⚔ 競合調査: [`docs/competition.md`](docs/competition.md)
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
