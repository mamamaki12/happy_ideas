// 生成スクリプト: node scripts/build.mjs
// 1. apps/<slug>/app.js がある試作に、共通の index.html（CSP・ヘッダー付き）を生成する
// 2. ideas/built.js（試作済み slug の一覧）を生成する
// 3. ideas/IDEAS.md（100個のアイデア一覧）を生成する
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IDEAS, CATEGORIES } from '../ideas/ideas.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appsDir = join(root, 'apps');

// 外部通信が必要なアプリだけ connect-src を広げる（最小権限）
const EXTRA_CONNECT = {
  'heat-guard': ['https://api.open-meteo.com'],
  'laundry-timer': ['https://api.open-meteo.com'],
};

const API_LABEL = {
  camera: 'カメラ', barcode: 'バーコード検出', notification: '通知', storage: '端末内保存', indexeddb: 'IndexedDB',
  geolocation: '位置情報', orientation: '傾き・方位センサー', motion: '加速度センサー', share: '共有', clipboard: 'クリップボード',
  vibration: '振動', 'speech-recognition': '音声認識', 'speech-synthesis': '音声読み上げ', fetch: '外部API',
  'wake-lock': '画面スリープ防止', microphone: 'マイク', 'web-audio': 'Web Audio', visibility: 'ページ表示状態',
  torch: 'ライト', 'media-recorder': '録音・録画', canvas: 'Canvas', fullscreen: '全画面', server: 'サーバー必須',
  webrtc: 'WebRTC', battery: 'バッテリー', 'service-worker': 'オフライン', file: 'ファイル読み込み', pointer: 'タッチ・ペン',
  keyboard: 'キーボード', webgpu: 'WebGPU', 'prompt-api': 'ブラウザ内AI',
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
<meta name="theme-color" content="#e8590c">
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

console.log(`built ${built.length} apps / ${IDEAS.length} ideas`);
