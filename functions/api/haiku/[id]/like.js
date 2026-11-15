// POST /api/haiku/:id/like { device } — いいね（同じ端末は1回だけ）
import { json, readJson, sameOrigin, visible, POST_ID, DEVICE } from '../_lib.js';
import { overRateLimit, LIMITS } from '../../../../server/limits.js';

export async function onRequestPost({ request, env, params }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  if (!POST_ID.test(params.id)) return json({ error: 'invalid' }, 400);
  let b; try { b = await readJson(request); } catch { return json({ error: 'bad request' }, 400); }
  if (!DEVICE.test(b?.device)) return json({ error: 'invalid' }, 400);
  if (!await visible(env, params.id)) return json({ error: 'not found' }, 404);
  const done = await env.DB.prepare("SELECT 1 AS x FROM haiku_marks WHERE haiku_id = ? AND who = ? AND kind = 'like'").bind(params.id, b.device).first();
  if (!done) {
    // 端末IDは自己申告なので、IDを変えながら押して水増しできないよう、同じ回線からの回数に上限を設ける
    if (await overRateLimit(env, request, 'haiku-like', LIMITS.haikuLike)) return json({ error: 'limit' }, 429);
    await env.DB.prepare("INSERT OR IGNORE INTO haiku_marks (haiku_id, who, kind) VALUES (?, ?, 'like')").bind(params.id, b.device).run();
    await env.DB.prepare("UPDATE haiku SET likes = (SELECT COUNT(*) FROM haiku_marks WHERE haiku_id = ? AND kind = 'like') WHERE id = ?").bind(params.id, params.id).run();
  }
  const { likes } = await env.DB.prepare('SELECT likes FROM haiku WHERE id = ?').bind(params.id).first();
  return json({ ok: true, likes });
}
