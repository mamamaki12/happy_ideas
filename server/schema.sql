-- ラリーメーカーの参加集計（任意機能）。個人情報は持たない。
-- 端末ID は参加者の端末で作るランダムな文字列で、人を特定する情報は含まない。
CREATE TABLE IF NOT EXISTS rallies (
  id TEXT PRIMARY KEY,           -- ラリーID（主催者の端末で生成）
  key_hash TEXT NOT NULL,        -- 主催者キーの SHA-256（キーそのものは保存しない）
  points INTEGER NOT NULL,       -- チェックポイント数
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  rally_id TEXT NOT NULL,
  device TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('start', 'stamp', 'complete')),
  idx INTEGER NOT NULL DEFAULT -1,
  day TEXT NOT NULL,
  UNIQUE (rally_id, device, type, idx)  -- 同じ端末の重複を数えない
);
CREATE INDEX IF NOT EXISTS events_rally ON events (rally_id, type);

-- 推し活手帳のサーバー通知（任意）。予定の中身（チケット名など）は保存しない。時刻と種類だけ。
CREATE TABLE IF NOT EXISTS push_subs (
  id TEXT PRIMARY KEY,           -- endpoint の SHA-256
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reminders (
  sub_id TEXT NOT NULL,
  at INTEGER NOT NULL,           -- 送る時刻（ミリ秒）
  kind TEXT NOT NULL CHECK (kind IN ('pay', 'result', 'event')),
  sent INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS reminders_due ON reminders (sent, at);

-- Claude API を使うアプリの回数制限（任意）。入力内容は保存しない。
-- k は「日付＋IP」のハッシュ（日ごとに変わるので、同じ人を日をまたいで追えない）。'*' は全体の合計。
CREATE TABLE IF NOT EXISTS ai_usage (
  k TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (k, day)
);
