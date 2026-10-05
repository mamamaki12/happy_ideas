// 文字列処理（DOM非依存）
/** 比較用に正規化: 小文字・句読点除去・全角英数→半角 */
export function normalize(s) {
  return String(s).normalize('NFKC').toLowerCase().replace(/[.,!?;:'"、。！？「」『』（）()…・\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
}
/** 編集距離（配列でも文字列でも可） */
export function levenshtein(a, b) {
  const m = a.length; const n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
/** 単語単位（英語）または文字単位（日本語）の一致率 0..1 と、単語ごとの正誤 */
export function similarity(expected, actual) {
  const e = normalize(expected); const a = normalize(actual);
  const latin = /[a-z]/.test(e);
  const E = latin ? e.split(' ').filter(Boolean) : [...e.replace(/ /g, '')];
  const A = latin ? a.split(' ').filter(Boolean) : [...a.replace(/ /g, '')];
  if (!E.length) return { score: A.length ? 0 : 1, words: [] };
  const score = Math.max(0, 1 - levenshtein(E, A) / Math.max(E.length, A.length));
  const aset = new Set(A);
  return { score, words: E.map((w) => ({ w, ok: aset.has(w) })) };
}
/** 話し言葉のフィラーを数える */
const FILLERS_JA = ['えーと', 'えっと', 'えー', 'あのー', 'あの', 'まあ', 'なんか', 'そのー', 'うーん'];
const FILLERS_EN = ['um', 'uh', 'erm', 'like', 'you know'];
export function countFillers(text) {
  const t = String(text);
  const out = {};
  let rest = t;
  for (const f of FILLERS_JA) { const n = rest.split(f).length - 1; if (n) { out[f] = n; rest = rest.split(f).join(' '); } }
  const low = ` ${normalize(t)} `;
  for (const f of FILLERS_EN) { const n = low.split(` ${f} `).length - 1; if (n) out[f] = n; }
  return out;
}
/** 話速（日本語は文字/分、英語は語/分） */
export function speechRate(text, ms) {
  const latin = /[a-z]/i.test(text) && !/[぀-ヿ一-鿿]/.test(text);
  const units = latin ? text.trim().split(/\s+/).filter(Boolean).length : text.replace(/[\s、。,.!?！？]/g, '').length;
  return { perMin: ms > 0 ? (units / ms) * 60000 : 0, unit: latin ? 'wpm' : '文字/分', units };
}
