// 句ひろば: 俳句の句帳と、みんなの広場（画面とサーバーの両方で使う部分）
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
/** 保存済みの記録で受け付ける最後の日付（時差のある国へ移動したときのために2日の余裕） */
export const latestDay = () => { const d = new Date(); d.setDate(d.getDate() + 2); return ymd(d); };
export function validDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
}

// ---- 音（モーラ）の数え方 ----
const SMALL = new Set([...'ぁぃぅぇぉゃゅょゎ']);
const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
/** 区切り（空白・改行・読点）で分けた句の部分 */
export const splitParts = (s) => String(s).trim().split(/[\s　、,／/]+/).filter(Boolean);
/**
 * かなの音の数（小さい「ゃゅょ」などは前の音と合わせて1つ、「っ」「ー」「ん」は1つ）。
 * 漢字や英字があって数えられないときは null
 */
export function moraOf(part) {
  let n = 0;
  for (const c of toHira(part)) {
    if (SMALL.has(c)) continue;
    if (/[ぁ-ゖーーゔ]/.test(c)) n++;
    else if (/[\p{P}\p{S}]/u.test(c)) continue;
    else return null;
  }
  return n;
}
/** 句（または読み）の音の数。{ parts: [5,7,5], total: 17 }。数えられなければ null */
export function countMora(s) {
  const parts = splitParts(s);
  if (!parts.length) return null;
  const counts = parts.map(moraOf);
  if (counts.some((n) => n === null)) return null;
  return { parts: counts, total: counts.reduce((a, b) => a + b, 0) };
}

// ---- 季語とお題 ----
// 月ごとのお題（俳句の季節は立春・立夏・立秋・立冬で分けるので、2月は春、5月は夏、8月は秋、11月は冬が中心）
export const KIGO = {
  1: [['初日', '新年', '元日の朝の日の光'], ['七草', '新年', '七草がゆ・春の七草'], ['寒椿', '冬', '寒さの中に咲くつばき'], ['霜柱', '冬', '土を持ち上げる氷の柱'], ['雪', '冬', '降る雪・積もる雪']],
  2: [['梅', '春', 'ほかの花より先に咲く白や紅の花'], ['春寒', '春', '立春をすぎても残る寒さ'], ['薄氷', '春', '春先に張るうすい氷'], ['雪解', '春', '雪がとけはじめるころ'], ['猫の恋', '春', '春先の猫のにぎやかさ']],
  3: [['春の風', '春', 'やわらかく吹く風'], ['菜の花', '春', '黄色い花の畑'], ['蝶', '春', 'ひらひら飛ぶちょうちょ'], ['卒業', '春', '卒業式・別れと門出'], ['春の雨', '春', 'しとしと降る雨']],
  4: [['桜', '春', '花見・咲く桜・散る桜'], ['花冷え', '春', '桜のころの冷え込み'], ['蛙', '春', '田んぼで鳴くかえる'], ['朧月', '春', 'かすんでぼんやりした月'], ['燕', '春', '南から来るつばめ']],
  5: [['若葉', '夏', 'みずみずしい新しい葉'], ['薫風', '夏', '若葉の香りを運ぶ風'], ['鯉幟', '夏', '空を泳ぐこいのぼり'], ['新茶', '夏', 'その年はじめのお茶'], ['母の日', '夏', 'お母さんへの感謝']],
  6: [['紫陽花', '夏', '雨に似合うあじさい'], ['梅雨', '夏', '長く続く雨の季節'], ['蛍', '夏', '夜に光るほたる'], ['青梅', '夏', '実ったばかりの青い梅'], ['夏至', '夏', 'いちばん昼の長い日']],
  7: [['蝉', '夏', '鳴きしきるせみ'], ['夕立', '夏', '夏の午後のにわか雨'], ['風鈴', '夏', '風に鳴る涼しい音'], ['向日葵', '夏', '太陽に向かう大きな花'], ['夏休み', '夏', '子どもたちの長い休み']],
  8: [['朝顔', '秋', '朝に咲くあさがお（俳句では秋）'], ['蜩', '秋', 'カナカナと鳴くひぐらし'], ['流れ星', '秋', '夜空を走る星'], ['西瓜', '秋', 'すいか（俳句では秋）'], ['盆', '秋', 'お盆・帰省・迎え火']],
  9: [['月', '秋', '名月・お月見'], ['虫の声', '秋', '夜に鳴く秋の虫'], ['秋風', '秋', '涼しくなった風'], ['曼珠沙華', '秋', '赤い彼岸花'], ['台風', '秋', '大きな嵐']],
  10: [['紅葉', '秋', '赤や黄に色づく葉'], ['秋晴', '秋', '高く澄んだ空'], ['柿', '秋', '実った柿'], ['夜長', '秋', '長くなった秋の夜'], ['新米', '秋', 'とれたてのお米']],
  11: [['小春', '冬', '冬のはじめの暖かい日'], ['落葉', '冬', '散ってたまる葉'], ['時雨', '冬', '降ったりやんだりする冷たい雨'], ['木枯', '冬', '冬のはじめの強く冷たい風'], ['七五三', '冬', '子どもの成長のお祝い']],
  12: [['冬至', '冬', 'いちばん昼の短い日'], ['柚子湯', '冬', '冬至に入るゆずのお風呂'], ['息白し', '冬', '白く見える吐く息'], ['枯野', '冬', '草の枯れた野原'], ['年の暮', '冬', '一年の終わりのあわただしさ']],
};
/** その日のお題（月の第1週は1つ目、第2週は2つ目…） */
export function topicFor(date = today()) {
  const m = Number(date.slice(5, 7)); const d = Number(date.slice(8, 10));
  const list = KIGO[m];
  const [word, season, hint] = list[Math.min(Math.floor((d - 1) / 7), list.length - 1)];
  return { word, season, hint };
}
/** 句の中にある、知っている季語（見つからなければ ''） */
export function findKigo(text) {
  for (const list of Object.values(KIGO)) for (const [w] of list) if (String(text).includes(w)) return w;
  return '';
}
/** 今月と前後の月の季語（入力の候補） */
export function kigoChoices(date = today()) {
  const m = Number(date.slice(5, 7));
  return [m, (m % 12) + 1, ((m + 10) % 12) + 1].flatMap((x) => KIGO[x].map(([w]) => w));
}

// ---- 広場に出すときの決まり（サーバーでも同じ関数で確かめる） ----
export const LIMIT = { text: 40, name: 12, kigo: 12, photoB64: 110000 };
const URLISH = /(https?:|:\/\/|www\.|\.(com|net|org|jp|io|me|ly|co|info|xyz|biz)\b|@[a-z0-9_]{3,}|line\.me)/i;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁦-⁩]/;
/** 句・俳号・季語を整える。決まりに合わなければ理由を投げる */
export function checkPost(b) {
  if (!b || typeof b !== 'object') throw new Error('invalid');
  const clean = (v, max, label, { min = 0, fallback = '' } = {}) => {
    if (v === undefined || v === null || v === '') v = fallback;
    if (typeof v !== 'string' || CONTROL.test(v)) throw new Error(`${label}に使えない文字があります。`);
    const s = v.replace(/[\s　]+/g, ' ').trim();
    if (s.length < min || s.length > max) throw new Error(`${label}は${min ? `${min}〜` : ''}${max}文字にしてください。`);
    if (URLISH.test(s)) throw new Error(`${label}に URL やアカウント名は書けません。`);
    return s;
  };
  return { text: clean(b.text, LIMIT.text, '句', { min: 3 }), name: clean(b.name, LIMIT.name, '俳号', { fallback: 'よみ人しらず' }), kigo: clean(b.kigo, LIMIT.kigo, '季語') };
}
/** 写真（JPEG の Base64）を確かめてバイト列にする。写真がなければ null */
export function checkPhoto(b64) {
  if (b64 === undefined || b64 === null || b64 === '') return null;
  if (typeof b64 !== 'string' || b64.length > LIMIT.photoB64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new Error('写真の形式が正しくありません。');
  const bin = atob(b64);
  if (bin.charCodeAt(0) !== 0xff || bin.charCodeAt(1) !== 0xd8 || bin.charCodeAt(2) !== 0xff) throw new Error('写真の形式が正しくありません。');
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// ---- 句帳（端末に保存するデータ）の検証 ----
const HEX = (n) => new RegExp(`^[a-f0-9]{${n}}$`);
export function validate(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 2000) throw new Error('対応していないデータの形です。');
  const latest = latestDay(); const ids = new Set();
  const entries = data.entries.map((e) => {
    const bad = () => { throw new Error('句帳の内容が正しくありません。'); };
    if (!e || typeof e.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(e.id) || ids.has(e.id)) bad();
    if (typeof e.text !== 'string' || !e.text.trim() || e.text.length > LIMIT.text) bad();
    if (!validDate(e.date) || e.date > latest) bad();
    for (const [f, max] of [['yomi', 80], ['kigo', LIMIT.kigo], ['memo', 300]]) if (typeof e[f] !== 'string' || e[f].length > max) bad();
    if (typeof e.photo !== 'string' || (e.photo && (!e.photo.startsWith('data:image/jpeg;base64,') || e.photo.length > LIMIT.photoB64 + 30))) bad();
    if (e.posted !== undefined && (!e.posted || !HEX(32).test(e.posted.id) || !HEX(64).test(e.posted.token))) bad();
    ids.add(e.id);
    const out = { id: e.id, text: e.text.trim(), yomi: e.yomi, kigo: e.kigo, date: e.date, memo: e.memo, photo: e.photo };
    if (e.posted) out.posted = { id: e.posted.id, token: e.posted.token };
    return out;
  });
  entries.sort((a, b) => b.date.localeCompare(a.date));
  return { version: 1, entries };
}

/** バックアップをすすめるか（5句以上あり、30日以上バックアップしていない。「あとで」を押したらその日まで出さない） */
export function backupDue(meta, count, now = today()) {
  if (count < 5 || (meta?.snooze && meta.snooze > now)) return false;
  return !meta?.last || (Date.parse(now) - Date.parse(meta.last)) / 86400000 >= 30;
}
