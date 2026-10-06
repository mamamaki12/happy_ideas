// POST /api/rally/:id/event  { device, type, idx } — 参加者の端末から、開始・スタンプ・完走を匿名で送る
import { json, readJson, sameOrigin, ID_RE, MAX_EVENTS_PER_RALLY } from '../_lib.js';

const DEVICE_RE = /^[a-f0-9]{16,32}$/;
export async function onRequestPost({ request, env, params }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  if (!ID_RE.test(params.id)) return json({ error: 'invalid' }, 400);
  let b; try { b = await readJson(request); } catch { return json({ error: 'bad request' }, 400); }
  if (!DEVICE_RE.test(b?.device) || !['start', 'stamp', 'complete'].includes(b?.type)) return json({ error: 'invalid' }, 400);
  const rally = await env.DB.prepare('SELECT points FROM rallies WHERE id = ?').bind(params.id).first();
  if (!rally) return json({ error: 'not found' }, 404);
  const idx = b.type === 'stamp' ? b.idx : -1;
  if (b.type === 'stamp' && !(Number.isInteger(idx) && idx >= 0 && idx < rally.points)) return json({ error: 'invalid' }, 400);
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM events WHERE rally_id = ?').bind(params.id).first();
  if (n >= MAX_EVENTS_PER_RALLY) return json({ error: 'limit' }, 429);
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare('INSERT OR IGNORE INTO events (rally_id, device, type, idx, day) VALUES (?, ?, ?, ?, ?)').bind(params.id, b.device, b.type, idx, day).run();
  return json({ ok: true }, 202);
}
