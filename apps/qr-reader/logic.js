// 読み取ったQRの中身を分類し、URLなら危険そうな特徴を挙げる（フィッシング対策の注意喚起）。
const SHORTENERS = ['bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'x.gd'];

export function classify(text) {
  const t = text.trim();
  if (/^https?:\/\//i.test(t)) return 'url';
  if (/^WIFI:/i.test(t)) return 'wifi';
  if (/^(mailto:|MATMSG:)/i.test(t)) return 'mail';
  if (/^tel:/i.test(t)) return 'tel';
  if (/^BEGIN:VCARD/i.test(t)) return 'contact';
  if (/^[0-9]{8,14}$/.test(t)) return 'product';
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return 'other-scheme';
  return 'text';
}

/** URL の注意点を返す。[] なら目立った問題なし。 */
export function urlWarnings(text) {
  const w = [];
  let u;
  try { u = new URL(text.trim()); } catch { return ['URLとして解釈できません']; }
  if (u.protocol === 'http:') w.push('暗号化されていない http の接続です');
  if (u.protocol !== 'http:' && u.protocol !== 'https:') w.push(`${u.protocol} のリンクは開きません`);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname) || u.hostname.startsWith('[')) w.push('ドメイン名ではなくIPアドレスです');
  if (u.hostname.split('.').some((p) => p.startsWith('xn--'))) w.push('見た目の似た文字を使ったドメイン（国際化ドメイン）の可能性があります');
  if (SHORTENERS.includes(u.hostname.replace(/^www\./, ''))) w.push('短縮URLです。行き先が分かりません');
  if (u.username || u.password) w.push('URLにユーザー名が含まれています（偽装によく使われます）');
  if (u.hostname.split('.').length > 4) w.push('サブドメインが多すぎます');
  if (/(login|signin|verify|account|password|wallet|update).*\./i.test(u.hostname)) w.push('ドメイン名に「login」などの単語が含まれています');
  return w;
}

/** WIFI:T:WPA;S:ssid;P:pass;; を解析 */
export function parseWifi(text) {
  const out = {};
  const body = text.replace(/^WIFI:/i, '');
  const re = /([TSPH]):((?:\\.|[^;])*);/g;
  let m;
  while ((m = re.exec(body))) out[m[1]] = m[2].replace(/\\(.)/g, '$1');
  return { ssid: out.S || '', password: out.P || '', security: out.T || 'nopass', hidden: out.H === 'true' };
}
