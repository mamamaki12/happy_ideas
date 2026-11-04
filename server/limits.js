// 1日あたりの回数を数える小さな仕組み（Cloudflare D1）。AI の回数制限と、ラリー・通知の乱用対策で使う。
// - IP はそのまま保存しない（塩と日付を混ぜたハッシュにするので、日をまたいで同じ人を追えない）
// - IPv6 は先頭 64 ビット（/64）ごとに数える。スマホや家庭の回線は /64 を丸ごと持っているので、
//   アドレスの後ろ半分を変えるだけで別人として数えられないようにする
// - 古い日付の行はときどき消す（回数を数えるのに必要なのは今日の分だけ）

/** 日本時間の今日（YYYY-MM-DD） */
export const todayJst = (now = Date.now()) => new Date(now + 9 * 3600000).toISOString().slice(0, 10);

export async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** IPv6 アドレスの先頭 64 ビット（例: "2001:db8:0:1::/64"）。IPv4 射影アドレスは IPv4 を返す。読めなければ null */
export function ipv6Prefix64(ip) {
  const s = String(ip).trim().toLowerCase().split('%')[0];
  const mapped = s.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const part = (x) => (x ? x.split(':') : []);
  const head = part(halves[0]); const tail = halves.length === 2 ? part(halves[1]) : [];
  // 末尾が IPv4 の書き方（64:ff9b::192.0.2.1 など）なら 2 グループ分。先頭 64 ビットには関係しない
  const last = tail.length ? tail : head;
  if (last.length && last.at(-1).includes('.')) last.splice(-1, 1, '0', '0');
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return `${groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(':')}::/64`;
}

/** 回数を数える単位。Cloudflare が付ける CF-Connecting-IP だけを使う（X-Forwarded-For は利用者が自由に書けるので使わない） */
export function clientKey(request) {
  const ip = (request.headers.get('cf-connecting-ip') || '').trim();
  if (!ip) return 'unknown';
  return ip.includes(':') ? (ipv6Prefix64(ip) ?? 'unknown') : ip;
}

/** IP などをそのまま保存しないためのハッシュ（塩・日付・用途を混ぜる） */
export const counterKey = (env, day, scope, key) => sha256hex(`${env.AI_SALT || 'happy-ideas'}:${day}:${scope ? `${scope}:` : ''}${key}`);

const SQL = {
  ai_usage: ['INSERT INTO ai_usage (k, day, n) VALUES (?, ?, 1) ON CONFLICT(k, day) DO UPDATE SET n = n + 1 RETURNING n', 'DELETE FROM ai_usage WHERE day < ?'],
  rate_limits: ['INSERT INTO rate_limits (k, day, n) VALUES (?, ?, 1) ON CONFLICT(k, day) DO UPDATE SET n = n + 1 RETURNING n', 'DELETE FROM rate_limits WHERE day < ?'],
};

/** 今日の回数を1つ増やし、増やした後の回数を返す（table は ai_usage か rate_limits） */
export async function bump(env, table, key, day) {
  const [inc, cleanup] = SQL[table];
  const { n } = await env.DB.prepare(inc).bind(key, day).first();
  if (Math.random() < 0.01) await env.DB.prepare(cleanup).bind(new Date(Date.parse(day) - 2 * 86400000).toISOString().slice(0, 10)).run();
  return n;
}

/**
 * 乱用対策の上限（ラリーの登録・参加、通知の購読）。超えたら true。
 * 表がない（schema.sql の入れ直し前）・D1 の一時的な失敗のときは止めない。集計や通知は付加機能なので、使えなくするより通す
 */
export async function overRateLimit(env, request, scope, limit, now = Date.now()) {
  try {
    const day = todayJst(now);
    return (await bump(env, 'rate_limits', await counterKey(env, day, scope, clientKey(request)), day)) > limit;
  } catch { return false; }
}

/** 乱用対策の上限値（同じ回線から1日に） */
export const LIMITS = {
  rallyCreate: 20, // 新しいラリーの登録
  rallyDevice: 300, // ラリーに初めて参加する端末（学校の Wi-Fi など、同じ回線の参加者が多い場合も考えて多めに）
  pushSubscribe: 20, // 新しい通知の購読
};
