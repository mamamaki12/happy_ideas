// 定期実行（Cloudflare Workers の Cron Trigger、例: 15分ごと）で、時刻が来た通知を送る
import { sendPush } from './webpush.js';
import { MESSAGES } from './policy.js';

export async function runDue(env, { now = Date.now(), fetchImpl = fetch, limit = 500 } = {}) {
  const vapid = { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || 'mailto:admin@example.com' };
  const due = (await env.DB.prepare('SELECT r.rowid AS rid, r.kind, s.id AS sub_id, s.endpoint, s.p256dh, s.auth FROM reminders r JOIN push_subs s ON s.id = r.sub_id WHERE r.sent = 0 AND r.at <= ? ORDER BY r.at LIMIT ?').bind(now, limit).all()).results;
  let sent = 0; let removed = 0; const gone = new Set();
  for (const d of due) {
    if (gone.has(d.sub_id)) continue;
    const msg = { ...MESSAGES[d.kind], url: 'products/oshi-techo/#tickets' }; // Service Worker のスコープからの相対パス
    try {
      const r = await sendPush({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, msg, vapid, { fetchImpl });
      if (r.gone) { gone.add(d.sub_id); continue; }
      if (r.status >= 200 && r.status < 300) sent++;
    } catch { /* 一時的な失敗は次回に回さない（重複通知より取りこぼしを選ぶ） */ }
    await env.DB.prepare('UPDATE reminders SET sent = 1 WHERE rowid = ?').bind(d.rid).run();
  }
  for (const id of gone) {
    await env.DB.prepare('DELETE FROM reminders WHERE sub_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(id).run(); removed++;
  }
  return { due: due.length, sent, removed };
}
