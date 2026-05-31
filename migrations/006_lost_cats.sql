-- Migration 006: Lost cat reports
CREATE TABLE IF NOT EXISTS lost_cats (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  cat_name TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  location TEXT NOT NULL,
  reward INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lost_cats_status ON lost_cats(status);
CREATE INDEX IF NOT EXISTS idx_lost_cats_user_id ON lost_cats(user_id);
