# ローカルで使うための手順書

自分のパソコンで、このリポジトリのアプリ（試作110個・製品版3つ）を動かすための手順です。アプリごとの場所と準備することは [`app-list.md`](./app-list.md) にまとめています。

| やりたいこと | 必要なもの | 読むところ |
|---|---|---|
| パソコンのブラウザで全部のアプリを使う | Python 3 | 1 → 2 |
| スマホでカメラ・位置情報・センサーを使う | 上に加えて、USBケーブル（Android）またはトンネル | 3 |
| AIアプリ10個を本物の Claude で動かす | Node.js 22 以上、Anthropic の APIキー | 4 |
| ラリーの参加集計・推し活手帳のサーバー通知を試す | Node.js 22 以上 | 5 |
| テストを実行する | Node.js 22 以上 | 6 |

サーバーなしで動くアプリ（AIアプリ以外の100個と製品版3つ）は、2 だけで使えます。データはすべてブラウザの中に保存され、外部には送られません（天気を使う3つのアプリだけ天気API（Open-Meteo）に問い合わせます）。

---

## 1. 準備

- **Python 3**: 起動用の簡単なWebサーバーに使います。macOS・Linux には多くの場合入っています。Windows は [python.org](https://www.python.org/downloads/) か Microsoft Store から入れます。
- **Node.js 22 以上**（4〜6 を使うときだけ）: [nodejs.org](https://nodejs.org/) の LTS 版。
- **ブラウザ**: 最近の Chrome・Edge・Safari・Firefox。機能によって対応ブラウザが違います（[`app-list.md`](./app-list.md) の「準備すること」を参照）。

リポジトリを手元に持ってきます。

```bash
git clone https://github.com/mamamaki12/happy_ideas.git
cd happy_ideas
git checkout claude/quirky-bohr-u8jne2   # main にマージされるまでは、このブランチにすべて入っています
```

## 2. パソコンで起動する

```bash
python3 -m http.server 4173      # npm run serve と同じ。Windows は py -m http.server 4173
```

ブラウザで **http://localhost:4173/** を開くと、トップページ（ギャラリー）が出ます。ここから全部のアプリを開けます。止めるときはターミナルで `Ctrl + C`。

- **`index.html` をダブルクリックして開くのは不可**です（`file://` ではアプリの部品が読み込めず、真っ白になります）。必ず上のサーバー経由で開いてください。
- `npm install` や `npm run build` は不要です。各アプリのページは生成済みのものがリポジトリに入っています。アプリのコード（`apps/<名前>/app.js`）や `ideas/ideas.js` を書き換えたときだけ、`npm run build` を実行してページと一覧を作り直します。
- カメラ・マイク・位置情報・通知は、初めて使うときにブラウザが許可を求めます。`localhost` は安全な場所として扱われるので、パソコンではそのまま使えます。
- **データの保存場所**: ブラウザの中に「アドレスとポート番号ごと」に保存されます。`localhost:4173` と `localhost:8788`（4・5 で使う）は別の保存場所なので、データは引き継がれません。消すときは各アプリの下の「このアプリについて」→「このアプリのデータを消す」。
- オフラインでも開けるようにする仕組み（Service Worker）が入っています。書き換えた内容が反映されないときは、強制再読み込み（Windows: `Ctrl + Shift + R`、Mac: `Cmd + Shift + R`）をしてください。

## 3. スマホで試す

カメラ・マイク・位置情報・通知・傾きセンサーは、ブラウザの決まりで **HTTPS か localhost** でしか使えません。同じWi-Fiのスマホからパソコンの `http://192.168.x.x:4173/` を開くと、画面は出ますがこれらの機能は動きません（保存や計算だけのアプリは動きます）。次のどれかを使ってください。

### A. Android（USBケーブル）: いちばん手軽で、外に公開しない

1. スマホで「開発者向けオプション」→「USBデバッグ」をオンにして、パソコンとUSBでつなぐ
2. パソコンの Chrome で `chrome://inspect/#devices` を開き、**Port forwarding** に `4173` → `localhost:4173` を追加してチェックを入れる
3. スマホの Chrome で **http://localhost:4173/** を開く（スマホからも localhost に見えるので、全部の機能が使えます）

### B. iPhone も使える: 一時的な HTTPS のアドレスを作る（トンネル）

[cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) を入れて、2 のサーバーを動かしたまま別のターミナルで実行します。

```bash
cloudflared tunnel --url http://localhost:4173
```

`https://〜.trycloudflare.com` のアドレスが表示されるので、スマホで開きます。

- **注意**: 動かしている間は、そのアドレスを知っている人なら誰でも開けます。使い終わったら `Ctrl + C` で止めてください（アドレスは毎回変わります）。
- iPhone で通知を受け取るには、Safari の共有ボタン →「ホーム画面に追加」で追加したアプリから開く必要があります。

### C. GitHub Pages で公開する

ずっと使えるアドレスにしたいときは、README の「スマホで試す（GitHub Pages で公開）」の手順で公開します（テストが通ると自動で公開されます）。

## 4. AIアプリ10個を本物の Claude で動かす

AIアプリ（`apps/ai-*`）は、APIキーをブラウザに置かないために、小さな中継サーバー（Cloudflare Pages Functions）を通して Claude API を呼びます。サーバーがない状態（2 の起動方法）では、自動で**デモ表示**（決まった例の結果を見せるだけ）になります。

ローカルで中継サーバーを動かす手順です。Cloudflare のアカウントやログインは不要です（パソコンの中だけで動きます）。

```bash
npm install                    # 初回だけ（テスト用の道具も入ります）
npm run site                   # 公開用のファイルを _site/ に集める
npx wrangler d1 execute happy-ideas --local --file=server/schema.sql   # 初回だけ。回数制限などの表をパソコンの中に作る
```

リポジトリの直下に **`.dev.vars`** というファイルを作り、APIキーを書きます（このファイルは `.gitignore` 済みで、コミットされません）。

```
ANTHROPIC_API_KEY=ここに Anthropic Console で作ったキー
# 任意: 1日の回数（IPごと。既定 20）
AI_DAILY_LIMIT=100
# 任意: 使うモデル（既定 claude-sonnet-5-5。安くするなら claude-haiku-4-5-20251001）
# AI_MODEL=claude-haiku-4-5-20251001
```

起動します。

```bash
npx wrangler pages dev --port 8788
```

**http://localhost:8788/** を開き、AIのカテゴリのアプリ（例: http://localhost:8788/apps/ai-why/ ）を開くと、「デモ表示中」の案内が消えて本物の Claude が答えます。

- **料金**: 使った分だけ Anthropic の料金がかかります。[Anthropic Console](https://console.anthropic.com/) で月の上限を設定しておくと安心です。
- `npx wrangler pages dev` は `_site/` の中身を配信します。コードを書き換えたら `npm run site` をもう一度実行してください。
- `.dev.vars` に `AI_ACCESS_CODE=好きな文字` を書くと、アプリの画面にアクセスコードの入力欄が出て、知っている人だけが使えるようになります（トンネルで人に見せるとき向け）。
- 仕組みと安全対策は [`ai-apps.md`](./ai-apps.md)。

## 5. ラリーの参加集計・推し活手帳のサーバー通知を試す

4 と同じ `npx wrangler pages dev --port 8788` で、ラリーメーカーの参加集計（`/api/rally/`）も動きます。4 の `d1 execute` を済ませていれば、追加の準備はありません。**http://localhost:8788/products/rally/** でラリーを作ると、主催者画面に「参加状況の集計がオンです」と出て、参加・完走の人数が見られます。

推し活手帳のサーバー通知は、鍵を作ってから、通知を送る係（Worker）も起動します。

```bash
node scripts/vapid-keys.mjs     # 出てきた VAPID_PUBLIC_KEY= と VAPID_PRIVATE_KEY= の2行を .dev.vars に追加する
npx wrangler pages dev --port 8788                                 # ターミナル1: アプリとAPI
npx wrangler dev -c wrangler.push.toml --port 8787 --test-scheduled  # ターミナル2: 通知を送る係
```

1. http://localhost:8788/products/oshi-techo/ の設定で「サーバーからの通知（ベータ）」をオンにする
2. 本番では15分ごとに送信の確認が動きます。ローカルではすぐ確認したいときに、次のアドレスを開くと1回だけ実行されます: http://localhost:8787/__scheduled?cron=*/15+*+*+*+*

- 2つのサーバーは、パソコンの中の同じデータベース（`.wrangler/` フォルダ。`.gitignore` 済み）を使います。
- 通知はブラウザの Push サービス（Google・Apple など）を通って届くので、インターネット接続が必要です。

## 6. テストを実行する

```bash
npm install
npx playwright install chromium   # 初回だけ。テスト用のブラウザを入れる
npm run check                     # ページの生成・セキュリティチェック・単体テスト・画面のテストを全部
```

個別に実行するときは `npm run unit`（単体テスト）、`npx playwright test tests/e2e/photo-editor.spec.js`（ファイルを指定）など。

## よくあるつまずき

| 症状 | 原因と対処 |
|---|---|
| 真っ白で何も出ない | `index.html` を直接開いている → 2 のサーバー経由で `http://localhost:4173/` を開く |
| `python3: command not found` | Windows は `py -m http.server 4173`。Python が入っていなければ入れる |
| `Address already in use` | ポート 4173 を別のものが使っている → `python3 -m http.server 5000` など別の番号にする（データの保存場所も別になります） |
| スマホでカメラ・位置情報が動かない | `http://192.168.〜` で開いている → 3 の A か B を使う |
| iPhone で傾きセンサーが動かない | 画面の「センサーを使う」ボタンを押して許可する（HTTPS が必要。3 の B か C） |
| カメラの許可を拒否してしまった | アドレスバーの左のアイコン（鍵や設定のマーク）からカメラを「許可」に戻して再読み込み |
| AIアプリが「デモ表示中」のまま | `http://localhost:8788/` で開いているか、`.dev.vars` に `ANTHROPIC_API_KEY` があるか、`d1 execute` を済ませたかを確認 |
| AIアプリで「AIからうまく答えが返ってきませんでした」 | APIキーが間違っている・残高や上限に達している。wrangler のターミナルの表示も確認 |
| 書き換えた内容が反映されない | 強制再読み込み。4・5 の方法なら `npm run site` を実行し直す |
| 前のデータが見えない | ポート番号やアドレスが違うと保存場所が別になる。同じアドレスで開く |
