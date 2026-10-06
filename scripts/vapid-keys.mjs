// VAPID の鍵ペアを作る: node scripts/vapid-keys.mjs
import { b64u } from '../server/push/webpush.js';
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
const { d } = await crypto.subtle.exportKey('jwk', kp.privateKey);
console.log(`VAPID_PUBLIC_KEY=${b64u.encode(pub)}\nVAPID_PRIVATE_KEY=${d}\n（秘密鍵はリポジトリに入れず、wrangler secret で登録してください）`);
