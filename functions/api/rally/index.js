// POST /api/rally  { id, keyHash, points } — 主催者がラリーを登録する（集計を使う場合のみ）
import { json, readJson, sameOrigin, ID_RE, HEX64 } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  let b; try { b = await readJson(request); } catch { return json({ error: 'bad request' }, 400); }
  if (!ID_RE.test(b?.id) || !HEX64.test(b?.keyHash) || !Number.isInteger(b?.points) || b.points < 1 || b.points > 30) return json({ error: 'invalid' }, 400);
  const existing = await env.DB.prepare('SELECT key_hash FROM rallies WHERE id = ?').bind(b.id).first();
  if (existing && existing.key_hash !== b.keyHash) return json({ error: 'id taken' }, 409); // 他人のラリーIDの乗っ取りを防ぐ
  if (existing) { await env.DB.prepare('UPDATE rallies SET points = ? WHERE id = ?').bind(b.points, b.id).run(); return json({ ok: true }); }
  await env.DB.prepare('INSERT INTO rallies (id, key_hash, points, created) VALUES (?, ?, ?, ?)').bind(b.id, b.keyHash, b.points, Date.now()).run();
  return json({ ok: true }, 201);
}
