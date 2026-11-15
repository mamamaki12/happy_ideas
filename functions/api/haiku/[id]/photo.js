// GET /api/haiku/:id/photo — 句に付けた写真（非表示の句の写真は出さない）
import { json, visible, POST_ID } from '../_lib.js';

export async function onRequestGet({ env, params }) {
  if (!POST_ID.test(params.id) || !await visible(env, params.id)) return json({ error: 'not found' }, 404);
  const row = await env.DB.prepare('SELECT data FROM haiku_photos WHERE id = ?').bind(params.id).first();
  if (!row) return json({ error: 'not found' }, 404);
  const bytes = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0));
  return new Response(bytes, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=600', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; sandbox" } });
}
