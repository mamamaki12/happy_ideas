// GET /api/rally/:id/stats（ヘッダー x-rally-key に主催者キー）— 主催者だけが集計を見られる
import { json, sha256hex, safeEqual, ID_RE } from '../_lib.js';

export async function onRequestGet({ request, env, params }) {
  if (!ID_RE.test(params.id)) return json({ error: 'invalid' }, 400);
  const key = request.headers.get('x-rally-key') || '';
  if (key.length < 32 || key.length > 128) return json({ error: 'unauthorized' }, 401);
  const rally = await env.DB.prepare('SELECT key_hash, points FROM rallies WHERE id = ?').bind(params.id).first();
  if (!rally || !safeEqual(await sha256hex(key), rally.key_hash)) return json({ error: 'unauthorized' }, 401);
  const count = async (type) => (await env.DB.prepare('SELECT COUNT(*) AS n FROM events WHERE rally_id = ? AND type = ?').bind(params.id, type).first()).n;
  const per = (await env.DB.prepare("SELECT idx, COUNT(*) AS n FROM events WHERE rally_id = ? AND type = 'stamp' GROUP BY idx").bind(params.id).all()).results;
  const days = (await env.DB.prepare("SELECT day, COUNT(*) AS n FROM events WHERE rally_id = ? AND type = 'start' GROUP BY day ORDER BY day").bind(params.id).all()).results;
  const stamps = Array(rally.points).fill(0); per.forEach((r) => { if (r.idx >= 0 && r.idx < rally.points) stamps[r.idx] = r.n; });
  return json({ starts: await count('start'), completes: await count('complete'), stamps, days });
}
