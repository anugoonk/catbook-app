-- Migration 005: Moderation fields
-- User status: active | banned | deleted
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Post visibility: 0 = visible, 1 = hidden by admin
ALTER TABLE posts ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_hidden ON posts(hidden);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
