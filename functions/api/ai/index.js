// GET /api/ai — AIが使えるか（未設定ならクライアントはデモ表示に切り替える）
export function onRequestGet({ env }) {
  const ready = !!(env.ANTHROPIC_API_KEY && env.DB);
  return new Response(JSON.stringify({ ready, needsCode: ready && !!env.AI_ACCESS_CODE }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
