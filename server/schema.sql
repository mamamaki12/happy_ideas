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

-- 乱用対策の回数（ラリーの登録・参加、通知の購読。同じ回線から1日に何回か）。形は ai_usage と同じ。
-- k は「用途＋日付＋IP（IPv6 は /64）」のハッシュ。古い日付の行は自動で消す。
CREATE TABLE IF NOT EXISTS rate_limits (
  k TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (k, day)
);

-- 句ひろば（俳句の広場）。投稿した句・俳号・季語・写真（小さく縮めた JPEG）だけを持つ。メールや名前の登録はない。
-- token_hash は投稿した端末だけが持つ削除用の合言葉の SHA-256（合言葉そのものは保存しない）。
CREATE TABLE IF NOT EXISTS haiku (
  id TEXT PRIMARY KEY,           -- ランダムな32文字
  text TEXT NOT NULL,
  kigo TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  has_photo INTEGER NOT NULL DEFAULT 0,
  token_hash TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,  -- 報告が3件たまると1（表示しない）
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS haiku_feed ON haiku (hidden, created);
CREATE INDEX IF NOT EXISTS haiku_kigo ON haiku (kigo, hidden, created);
CREATE TABLE IF NOT EXISTS haiku_photos (
  id TEXT PRIMARY KEY,           -- haiku.id
  data TEXT NOT NULL             -- JPEG の Base64
);
-- いいね・報告（同じ端末・同じ回線から何度押しても1回）。
-- いいねの who は端末のランダムなID、報告の who は「句ごとに変わる回線のハッシュ」（句をまたいで同じ人を追えない）
CREATE TABLE IF NOT EXISTS haiku_marks (
  haiku_id TEXT NOT NULL,
  who TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('like', 'report')),
  UNIQUE (haiku_id, who, kind)
);
