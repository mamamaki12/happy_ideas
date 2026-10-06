// 生成スクリプト: node scripts/build.mjs
// 1. apps/<slug>/app.js がある試作に、共通の index.html（CSP・ヘッダー付き）を生成する
// 2. ideas/built.js（試作済み slug の一覧）を生成する
// 3. ideas/IDEAS.md（100個のアイデア一覧）を生成する
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IDEAS, CATEGORIES } from '../ideas/ideas.js';
import { FEASIBILITY, GRADES } from '../ideas/feasibility.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appsDir = join(root, 'apps');

// 外部通信が必要なアプリだけ connect-src を広げる（最小権限）
const EXTRA_CONNECT = {
  'heat-guard': ['https://api.open-meteo.com'],
  'laundry-timer': ['https://api.open-meteo.com'],
  'rain-timeline': ['https://api.open-meteo.com'],
};

const API_LABEL = {
  camera: 'カメラ', barcode: 'バーコード検出', notification: '通知', storage: '端末内保存', indexeddb: 'IndexedDB',
  geolocation: '位置情報', orientation: '傾き・方位センサー', motion: '加速度センサー', share: '共有', clipboard: 'クリップボード',
  vibration: '振動', 'speech-recognition': '音声認識', 'speech-synthesis': '音声読み上げ', fetch: '外部API',
  'wake-lock': '画面スリープ防止', microphone: 'マイク', 'web-audio': 'Web Audio', visibility: 'ページ表示状態',
  torch: 'ライト', 'media-recorder': '録音・録画', canvas: 'Canvas', fullscreen: '全画面', server: 'サーバー必須',
  webrtc: 'WebRTC', battery: 'バッテリー', 'service-worker': 'オフライン', file: 'ファイル読み込み', pointer: 'タッチ・ペン',
  keyboard: 'キーボード', webgpu: 'WebGPU', 'prompt-api': 'ブラウザ内AI', claude: 'Claude API',
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function csp(slug) {
  const connect = ["'self'", ...(EXTRA_CONNECT[slug] || [])].join(' ');
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: mediastream:",
    `connect-src ${connect}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

function page(idea) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp(idea.slug)}">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#c2410c">
<meta name="description" content="${escapeHtml(idea.summary)}">
<title>${escapeHtml(idea.name)}</title>
<link rel="icon" href="../../shared/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../../shared/style.css">
${existsSync(join(appsDir, idea.slug, 'style.css')) ? '<link rel="stylesheet" href="style.css">\n' : ''}<script type="module" src="app.js"></script>
</head>
<body>
<header class="app-header">
  <a class="back" href="../../index.html">← 一覧</a>
  <h1>${escapeHtml(idea.name)}</h1>
</header>
<main id="app">
  <p class="lead">${escapeHtml(idea.summary)}</p>
  <noscript><p class="error">このアプリは JavaScript が必要です。</p></noscript>
</main>
<footer class="app-footer">
  <details>
    <summary>このアプリについて（#${idea.id}）</summary>
    <p><b>ニーズ:</b> ${escapeHtml(idea.need)}</p>
    ${FEASIBILITY[idea.slug] ? `<p><b>実現性 ${FEASIBILITY[idea.slug][0]}（${escapeHtml(GRADES[FEASIBILITY[idea.slug][0]])}）:</b> ${escapeHtml(FEASIBILITY[idea.slug][1])}</p>` : ''}
    <p>${idea.ai ? '入力した文章や写真は、AIサーバーが設定されているときだけ、答えを作るために Anthropic の Claude API へ送られます（このサイトでは保存しません）。履歴などはこの端末の中だけに保存されます。' : 'データはこの端末の中だけに保存され、外部には送られません。'}</p>
    <button type="button" class="small danger" data-clear-data="${escapeHtml(idea.slug)}">このアプリのデータを消す</button>
  </details>
</footer>
<script type="module" src="../../shared/page.js"></script>
</body>
</html>
`;
}

const built = [];
for (const idea of IDEAS) {
  if (!idea.slug) continue;
  const dir = join(appsDir, idea.slug);
  if (!existsSync(join(dir, 'app.js'))) continue;
  writeFileSync(join(dir, 'index.html'), page(idea));
  built.push(idea.slug);
}

// ideas.js に無い apps/ 配下のディレクトリを警告
for (const d of readdirSync(appsDir, { withFileTypes: true })) {
  if (d.isDirectory() && !IDEAS.some((i) => i.slug === d.name)) console.warn(`warn: apps/${d.name} は ideas.js に登録されていません`);
}

writeFileSync(join(root, 'ideas/built.js'), `// 自動生成（scripts/build.mjs）。手で編集しない。\nexport const BUILT = ${JSON.stringify(built, null, 0)};\n`);

// IDEAS.md
const lines = [
  '# アプリアイデア100',
  '',
  '> 自動生成ファイルです（`node scripts/build.mjs`）。元データは [`ideas.js`](./ideas.js)、根拠は [`../docs/market-research.md`](../docs/market-research.md)、各試作の検証結果は [`../docs/feasibility.md`](../docs/feasibility.md) を参照。',
  '',
  `試作済み: **${built.length} / ${IDEAS.length}**`,
  '',
];
for (const [cat, label] of Object.entries(CATEGORIES)) {
  const items = IDEAS.filter((i) => i.cat === cat);
  lines.push(`## ${label}（${items.length}）`, '', '| # | アプリ | 概要 | ニーズの根拠 | 使うWeb機能 | 試作 |', '|---|---|---|---|---|---|');
  for (const i of items) {
    const apis = i.apis.map((a) => API_LABEL[a] || a).join('、') || '—';
    const status = built.includes(i.slug) ? `✅ [apps/${i.slug}](../apps/${i.slug}/)` : (i.slug ? '⏳ 未着手' : '💭 アイデアのみ');
    lines.push(`| ${i.id} | ${i.name} | ${i.summary} | ${i.need} | ${apis} | ${status} |`);
  }
  lines.push('');
}
writeFileSync(join(root, 'ideas/IDEAS.md'), lines.join('\n'));

// API ラベルをギャラリー用に書き出す
writeFileSync(join(root, 'ideas/api-labels.js'), `// 自動生成（scripts/build.mjs）\nexport const API_LABEL = ${JSON.stringify(API_LABEL, null, 2)};\n`);

// docs/feasibility-apps.md（試作ごとの実現性の表）
const feas = [
  '# 試作ごとの実現性',
  '',
  '> 自動生成ファイルです（`node scripts/build.mjs`）。元データは [`../ideas/feasibility.js`](../ideas/feasibility.js)。機能ごとの解説は [`feasibility.md`](./feasibility.md)。',
  '',
  ...Object.entries(GRADES).map(([g, l]) => `- **${g}**: ${l}（${built.filter((sl) => FEASIBILITY[sl]?.[0] === g).length}個）`),
  '',
  '| 判定 | # | アプリ | 使った機能 | 分かったこと |',
  '|---|---|---|---|---|',
];
for (const g of Object.keys(GRADES)) {
  for (const i of IDEAS.filter((x) => built.includes(x.slug) && FEASIBILITY[x.slug]?.[0] === g)) {
    feas.push(`| ${g} | ${i.id} | [${i.name}](../apps/${i.slug}/) | ${i.apis.map((a) => API_LABEL[a] || a).join('、')} | ${FEASIBILITY[i.slug][1]} |`);
  }
}
const missing = built.filter((sl) => !FEASIBILITY[sl]);
if (missing.length) console.warn(`warn: 実現性の判定がない試作: ${missing.join(', ')}`);
writeFileSync(join(root, 'docs/feasibility-apps.md'), `${feas.join('\n')}\n`);

// docs/app-list.md（ローカルで使うときの一覧。使う機能から「準備すること」を出す）
const PREP = {
  camera: 'カメラを許可（パソコンはWebカメラ）', microphone: 'マイクを許可', geolocation: '位置情報を許可（パソコンは誤差が大きい）',
  orientation: '傾き・方位センサー（スマホのみ。iPhoneは画面のボタンで許可）', motion: '加速度センサー（スマホのみ。iPhoneは画面のボタンで許可）',
  notification: '通知を許可（ページを開いている間だけ届く）', 'speech-recognition': '音声認識（Chrome・Safari。Firefoxは不可）',
  barcode: 'バーコード検出（AndroidのChromeのみ。それ以外は手入力）', torch: 'ライト（AndroidのChromeのみ）', vibration: '振動（Androidのみ）',
  webrtc: 'タブを2つ、または端末を2台使う', fetch: 'インターネット接続（天気API）', 'prompt-api': 'Chromeの内蔵AI（なければ簡易要約）',
  claude: 'AIサーバー（なければデモ表示。→ local-setup.md の4）',
};
const PHONE_ONLY = ['orientation', 'motion', 'torch'];
const list = [
  '# アプリ一覧（ローカルで使うとき）',
  '',
  '> 自動生成ファイルです（`node scripts/build.mjs`）。元データは [`../ideas/ideas.js`](../ideas/ideas.js)。起動のしかたは [`local-setup.md`](./local-setup.md)。',
  '',
  '`npm run serve` で起動したあと、`http://localhost:4173/` の後ろに「場所」を付けて開きます（例: `http://localhost:4173/apps/habit/`）。トップページ（ギャラリー）からも全部開けます。',
  '',
  '- **PC**: ◯ = パソコンでも試せる ／ 📱 = センサーなどを使うのでスマホで試す（スマホでの開き方は local-setup.md の3）',
  '- **準備すること**: 初めて開いたときにブラウザが許可を求めるもの・動く環境の条件。空欄はそのまま使えるもの',
  '',
  '## 製品版',
  '',
  '| アプリ | 場所 | できること | PC | 準備すること |',
  '|---|---|---|---|---|',
  '| ラリーメーカー | `products/rally/` | 位置情報スタンプラリーを作る・参加する（QR・ポスター付き） | ◯ | 参加するときは位置情報を許可。参加人数の集計はサーバーがあるときだけ（local-setup.md の5） |',
  '| 推し活手帳 | `products/oshi-techo/` | 推しごとの支出・当落・予定・写真・年間まとめ | ◯ | 写真はカメラを許可。サーバー通知はサーバーがあるときだけ（local-setup.md の5） |',
  '| てもとフォト | `products/photo-editor/` | 写真編集（フィルター・補正・修復・文字）・RAW・グリッド。写真は端末の外に出ない | ◯ | WebGL2 対応ブラウザ（最近のChrome・Safari・Firefox・Edge） |',
  '',
];
for (const [cat, label] of Object.entries(CATEGORIES)) {
  const items = IDEAS.filter((i) => i.cat === cat && built.includes(i.slug));
  if (!items.length) continue;
  list.push(`## ${label}（${items.length}）`, '', '| # | アプリ | 場所 | できること | PC | 準備すること |', '|---|---|---|---|---|---|');
  for (const i of items) {
    const prep = i.apis.filter((a) => PREP[a]).map((a) => PREP[a]).join('・');
    const pc = i.apis.some((a) => PHONE_ONLY.includes(a)) ? '📱' : '◯';
    list.push(`| ${i.id} | ${i.name} | \`apps/${i.slug}/\` | ${i.summary} | ${pc} | ${prep} |`);
  }
  list.push('');
}
writeFileSync(join(root, 'docs/app-list.md'), list.join('\n'));

console.log(`built ${built.length} apps / ${IDEAS.length} ideas`);
