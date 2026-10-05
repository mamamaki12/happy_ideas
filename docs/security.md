# セキュリティ方針とチェック結果

最終確認: 2026-10-05 ／ 対象: 試作100個 + ギャラリー

## 脅威モデル（何を守るか）

試作はすべて**静的ファイルだけ**で動き、サーバーもアカウントもありません。データは利用者の端末（localStorage / IndexedDB）にだけ保存されます。そのため主なリスクは次の3つです。

| リスク | 例 | 対策 |
|---|---|---|
| XSS（入力した文字がスクリプトとして動く） | 食品名に `<img onerror=…>` を入れる | DOM は `h()` で組み立て、文字は必ず `textContent`。`innerHTML` は全面禁止 |
| 外部から渡されるデータ | スタンプラリーのURL、QRコードの中身、CSVファイル | 形式チェック・長さ制限・件数制限。危険なURLは開く前に警告 |
| プライバシー（カメラ・マイク・位置情報） | 写真や位置が外部に送られる | 外部送信なし。天気APIには座標を小数点以下2〜3桁（約1km）に丸めて送るだけ |

## 実施している対策

### 1. Content Security Policy（全ページ）
```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:;
media-src 'self' blob: mediastream:; connect-src 'self'; worker-src 'self';
object-src 'none'; base-uri 'none'; form-action 'none'
```
- インラインスクリプト・`eval`・外部スクリプトは一切使えません
- `connect-src` は天気を使う2アプリだけ `https://api.open-meteo.com` を追加（最小権限）
- CSP は `scripts/build.mjs` が全ページに同じものを生成するので、書き漏れが起きません
- meta タグでは指定できない `frame-ancestors`・`Permissions-Policy` などは `_headers`（Netlify/Cloudflare Pages 用）で補います

### 2. 危険なAPIの禁止（静的チェック）
`npm run security`（`scripts/security-check.mjs`）が次を検出するとエラーになります。
- `innerHTML` / `outerHTML` への代入、`insertAdjacentHTML`、`eval`、`new Function`、`document.write`、文字列を渡す `setTimeout`
- HTML のインラインスクリプト・インラインイベントハンドラ（`onclick=` など）
- CSP の欠落、`unsafe-inline` / `unsafe-eval`
- `target="_blank"` に `rel="noopener"` がないリンク
- 外部スクリプト・外部モジュールの読み込み

### 3. 入力の扱い
| 箇所 | 対策 |
|---|---|
| QRコード読み取り | `javascript:` などは開かない。http・IPアドレス・国際化ドメイン（偽装の可能性）・短縮URL・ユーザー名入りURLを警告（`apps/qr-reader/logic.js`） |
| スタンプラリーのURL | Base64URL→JSON の解析失敗は拒否。タイトル40文字・地点50件まで。数値以外の座標や文字列以外の名前は除外（`apps/stamp-rally/logic.js`） |
| 座標・地図URLの貼り付け | 正規表現で数値だけ取り出し、緯度±90・経度±180の範囲外は拒否 |
| CSV読み込み（暗記カード） | 2MB・5000件まで |
| CSV書き出し（持ち物台帳） | 先頭が `= + - @` のセルは `'` を付けて、表計算ソフトで数式として実行されないようにする（CSVインジェクション対策） |
| GPX書き出し（おさんぽ） | XML の特殊文字をエスケープ |
| ICS書き出し（家族の予定） | RFC 5545 に従い `;` `,` `\` 改行 をエスケープ（改行による項目の注入を防ぐ） |
| URLで受け取るデータ（ほしいものリスト・家族の予定・トイレマップ） | 2万文字まで・Base64URL以外の文字は拒否。項目ごとに型・長さ・件数・座標範囲をチェック。商品URLは http(s) 以外を捨てる |
| GeoJSON の取り込み（ヒヤリハット地図） | 2MB・1000件まで。Point 以外・範囲外の座標・文字列以外の属性は捨てる |
| WebRTC で届くデータ（トランシーバー・写真交換） | チャットは500文字まで textContent で表示。写真は宣言したサイズ（5MBまで）を超えたら受信を中止し、MIMEタイプは画像だけ許可 |
| 電話リンク（緊急カード） | 数字だけを取り出して `tel:` に使う |

### 4. プライバシー
- カメラ・マイクはページを離れる（`pagehide`）と止める
- 写真から色だけ使うアプリ（空の色）は写真自体を保存しない
- 外部への fetch は `credentials: 'omit'`・`referrerPolicy: 'no-referrer'`
- 心拍計などは「医療機器ではない」ことを明示

## 自動テストによる確認

| テスト | 内容 | 結果 |
|---|---|---|
| `tests/e2e/xss.spec.js` | **全100アプリ**の全テキスト入力欄に XSS ペイロード（`<img onerror>`・`<script>`・`<svg onload>`）を入れて送信。スクリプト実行・要素の生成・CSP違反・想定外のダイアログがないことを確認 | 100/100 成功 |
| `tests/e2e/smoke.spec.js` | 全アプリで未捕捉例外・console.error（CSP違反を含む）がないこと | 成功 |
| `tests/unit/` | URL警告、ラリーURLの改ざん拒否、座標解析の範囲チェックなど | 成功 |
| `npm audit` | 依存パッケージの脆弱性（依存はテスト用の Playwright のみ） | 0件 |

## 本番公開する場合の残課題
- HTTPS 必須（カメラ・マイク・位置情報・Service Worker の要件）
- 天気API（Open-Meteo）を商用で使う場合は利用規約に従い有料プランが必要
- 端末内保存なので、端末の紛失・ブラウザのデータ削除でデータは消える。必要ならエクスポート機能を追加する
- 共有サーバーが必要なアイデア（共有アルバムなど）を作る場合は、認証・レート制限・アップロード検査が別途必要
