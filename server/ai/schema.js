// AIの出力の形を1か所で定義する小さな仕組み。
// 同じ定義から (1) Claude に渡すツールの JSON Schema と (2) 返ってきた値の検査・切り詰めを作る。
// AIの出力は信用しない: 型が違う・長すぎる・件数が多すぎるものは、ここで直すか捨てる。

// 改行とタブ以外の制御文字を消す
// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g;
export const cleanText = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').replace(CTRL, '').trim().slice(0, max);

export const S = {
  str: (max, description) => ({ json: { type: 'string', ...(description ? { description } : {}) }, clean: (v) => cleanText(v, max) }),
  /** YYYY-MM-DD か空文字 */
  date: (description = 'YYYY-MM-DD。不明なら空文字') => ({
    json: { type: 'string', description },
    clean: (v) => { const s = cleanText(v, 10); return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s) ? s : ''; },
  }),
  /** HH:MM か空文字 */
  time: (description = 'HH:MM（24時間）。不明なら空文字') => ({
    json: { type: 'string', description },
    clean: (v) => { const s = cleanText(v, 5); return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : ''; },
  }),
  int: (min, max, description) => ({
    json: { type: 'integer', ...(description ? { description } : {}) },
    clean: (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min; },
  }),
  bool: (description) => ({ json: { type: 'boolean', ...(description ? { description } : {}) }, clean: (v) => v === true }),
  enum: (values, fallback, description) => ({
    json: { type: 'string', enum: values, ...(description ? { description } : {}) },
    clean: (v) => (values.includes(v) ? v : fallback),
  }),
  arr: (item, maxItems, description) => ({
    json: { type: 'array', items: item.json, ...(description ? { description } : {}) },
    clean: (v) => (Array.isArray(v) ? v.slice(0, maxItems).map(item.clean).filter((x) => x !== '' && x !== null) : []),
  }),
  obj: (props, description) => ({
    json: { type: 'object', properties: Object.fromEntries(Object.entries(props).map(([k, p]) => [k, p.json])), required: Object.keys(props), ...(description ? { description } : {}) },
    clean: (v) => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
      return Object.fromEntries(Object.entries(props).map(([k, p]) => [k, p.clean(v[k])]));
    },
  }),
};
