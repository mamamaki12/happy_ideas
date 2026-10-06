// 通知送信用の Worker（Cron Trigger）。wrangler.push.toml でデプロイする。
import { runDue } from './cron.js';
export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(runDue(env)); },
};
