// 端末内だけで動く抽出型要約（ブラウザ内AIがない環境のフォールバック）。
// 文を分け、文字バイグラム（日本語）または単語（英語）の出現頻度で重要な文を選ぶ。
export function splitSentences(text) {
  return String(text).replace(/\r/g, '').split(/(?<=[。！？!?])\s*|\n+|(?<=\.)\s+(?=[A-Z])/).map((s) => s.trim()).filter((s) => s.length > 1);
}
const STOP_EN = new Set('the a an and or but of to in on for with is are was were be been it this that as at by from we you they he she i not'.split(' '));
function terms(s) {
  if (/[぀-ヿ一-鿿]/.test(s)) {
    const t = s.replace(/[、。！？「」『』（）・\s]/g, '');
    const out = []; for (let i = 0; i < t.length - 1; i++) { const bg = t.slice(i, i + 2); if (!/^[ぁ-ん]{2}$/.test(bg)) out.push(bg); } // ひらがなだけの2文字は助詞などなので除外
    return out;
  }
  return s.toLowerCase().match(/[a-z0-9']+/g)?.filter((w) => !STOP_EN.has(w) && w.length > 2) || [];
}
export function summarize(text, maxSentences = 3) {
  const sents = splitSentences(text);
  if (sents.length <= maxSentences) return sents;
  const freq = new Map();
  sents.forEach((s) => new Set(terms(s)).forEach((t) => freq.set(t, (freq.get(t) || 0) + 1)));
  const scored = sents.map((s, i) => {
    const ts = terms(s); const sc = ts.reduce((a, t) => a + (freq.get(t) > 1 ? freq.get(t) : 0), 0) / Math.max(4, ts.length);
    return { s, i, sc: sc + (i === 0 ? 0.5 : 0) }; // 冒頭の文は少し優遇
  });
  return scored.sort((a, b) => b.sc - a.sc).slice(0, maxSentences).sort((a, b) => a.i - b.i).map((x) => x.s);
}
