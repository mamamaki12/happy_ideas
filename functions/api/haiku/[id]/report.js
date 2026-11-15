// POST /api/haiku/:id/report — 不適切な句の報告。別々の回線から3件で自動的に非表示
import { json, sameOrigin, sha256hex, visible, POST_ID, HIDE_AFTER } from '../_lib.js';
import { overRateLimit, LIMITS, clientKey } from '../../../../server/limits.js';

export async function onRequestPost({ request, env, params }) {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  if (!POST_ID.test(params.id)) return json({ error: 'invalid' }, 400);
  if (!await visible(env, params.id)) return json({ ok: true }); // すでに非表示
  // 1人が端末IDを変えて何度も報告し、他人の句を消せないように、報告は「回線」で数える。
  // 回線はそのまま保存せず、句ごとに変わるハッシュにする（句をまたいで同じ人を追えない）
  const who = await sha256hex(`${env.AI_SALT || 'happy-ideas'}:haiku-report:${params.id}:${clientKey(request)}`);
  const done = await env.DB.prepare("SELECT 1 AS x FROM haiku_marks WHERE haiku_id = ? AND who = ? AND kind = 'report'").bind(params.id, who).first();
  if (done) return json({ ok: true });
  if (await overRateLimit(env, request, 'haiku-report', LIMITS.haikuReport)) return json({ error: 'limit' }, 429);
  await env.DB.prepare("INSERT OR IGNORE INTO haiku_marks (haiku_id, who, kind) VALUES (?, ?, 'report')").bind(params.id, who).run();
  await env.DB.prepare(`UPDATE haiku SET reports = (SELECT COUNT(*) FROM haiku_marks WHERE haiku_id = ? AND kind = 'report'), hidden = CASE WHEN (SELECT COUNT(*) FROM haiku_marks WHERE haiku_id = ? AND kind = 'report') >= ${HIDE_AFTER} THEN 1 ELSE hidden END WHERE id = ?`).bind(params.id, params.id, params.id).run();
  return json({ ok: true });
}
