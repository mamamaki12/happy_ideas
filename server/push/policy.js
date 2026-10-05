// 通知の購読で受け付けるもの（サーバーが任意のURLに送信させられる SSRF を防ぐため、送り先を既知の Push サービスに限る）
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /^[a-z0-9-]+\.notify\.windows\.com$/];
export function validEndpoint(s) {
  try { const u = new URL(s); return u.protocol === 'https:' && !u.port && s.length <= 1000 && PUSH_HOSTS.some((re) => re.test(u.hostname)); } catch { return false; }
}
const B64U = /^[A-Za-z0-9_-]+$/;
export const validKeys = (k) => typeof k?.p256dh === 'string' && typeof k?.auth === 'string' && B64U.test(k.p256dh) && B64U.test(k.auth) && k.p256dh.length >= 80 && k.p256dh.length <= 100 && k.auth.length >= 16 && k.auth.length <= 32;
export const KINDS = ['pay', 'result', 'event'];
export const MAX_REMINDERS = 50;
/** 通知の文面は種類ごとに固定（予定の中身はサーバーに送らない） */
export const MESSAGES = {
  pay: { title: '🎫 入金期限が近いチケットがあります', body: 'アプリを開いて確認してください' },
  result: { title: '📣 今日は当落発表があります', body: '結果を記録しましょう' },
  event: { title: '🎤 推しの予定が近づいています', body: '持ち物とチケットを確認しよう' },
};
