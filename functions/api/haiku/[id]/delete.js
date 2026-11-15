// POST /api/haiku/:id/delete { token } — 投稿した端末から、広場の句を下げる
import { json, readJson, sameOrigin, sha256hex, safeEqual, POST_ID, HEX64 } from '../_lib.js';

export async function onRequestPost({ request, env, params }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  if (!POST_ID.test(params.id)) return json({ error: 'invalid' }, 400);
  let b; try { b = await readJson(request); } catch { return json({ error: 'bad request' }, 400); }
  if (!HEX64.test(b?.token)) return json({ error: 'invalid' }, 400);
  const row = await env.DB.prepare('SELECT token_hash FROM haiku WHERE id = ?').bind(params.id).first();
  if (!row) return json({ ok: true }); // もうない
  if (!safeEqual(await sha256hex(b.token), row.token_hash)) return json({ error: 'forbidden' }, 403);
  for (const sql of ['DELETE FROM haiku WHERE id = ?', 'DELETE FROM haiku_photos WHERE id = ?', 'DELETE FROM haiku_marks WHERE haiku_id = ?']) await env.DB.prepare(sql).bind(params.id).run();
  return json({ ok: true });
}
