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
