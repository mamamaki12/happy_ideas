// POST /api/push/subscribe { subscription: {endpoint, keys}, reminders: [{at, kind}] } — 購読と通知予定を登録（予定は毎回まるごと置き換え）
// DELETE /api/push/subscribe { endpoint } — 購読を解除
import { json, readJson, sameOrigin, sha256hex } from '../rally/_lib.js';
import { validEndpoint, validKeys, KINDS, MAX_REMINDERS } from '../../../server/push/policy.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  let b; try { b = await readJson(request); } catch { return json({ error: 'bad request' }, 400); }
  const sub = b?.subscription;
  if (!validEndpoint(sub?.endpoint) || !validKeys(sub?.keys)) return json({ error: 'invalid subscription' }, 400);
  if (!Array.isArray(b.reminders) || b.reminders.length > MAX_REMINDERS) return json({ error: 'invalid reminders' }, 400);
  const now = Date.now(); const max = now + 400 * 86400000;
  const rems = b.reminders.filter((r) => KINDS.includes(r?.kind) && Number.isInteger(r?.at) && r.at > now && r.at < max);
  const id = await sha256hex(sub.endpoint);
  await env.DB.prepare('INSERT INTO push_subs (id, endpoint, p256dh, auth, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth').bind(id, sub.endpoint, sub.keys.p256dh, sub.keys.auth, now).run();
  await env.DB.prepare('DELETE FROM reminders WHERE sub_id = ? AND sent = 0').bind(id).run();
  for (const r of rems) await env.DB.prepare('INSERT INTO reminders (sub_id, at, kind) VALUES (?, ?, ?)').bind(id, r.at, r.kind).run();
  return json({ ok: true, reminders: rems.length });
}

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  let b; try { b = await readJson(request); } catch { return json({ error: 'bad request' }, 400); }
  if (!validEndpoint(b?.endpoint)) return json({ error: 'invalid' }, 400);
  const id = await sha256hex(b.endpoint);
  await env.DB.prepare('DELETE FROM reminders WHERE sub_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
