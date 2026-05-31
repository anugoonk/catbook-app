import { randomUUID } from 'node:crypto';
import { db } from './database.js';

const setup = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id         TEXT PRIMARY KEY,
      from_id    TEXT NOT NULL,
      to_id      TEXT NOT NULL,
      text       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_id,to_id,created_at);
  `);
};
setup();

export const getConversation = (userA, userB, since = null) => {
  if (since) {
    return db.prepare(`
      SELECT * FROM messages
      WHERE ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?))
        AND created_at > ?
      ORDER BY created_at ASC LIMIT 200
    `).all(userA, userB, userB, userA, since);
  }
  return db.prepare(`
    SELECT * FROM messages
    WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?)
    ORDER BY created_at ASC LIMIT 200
  `).all(userA, userB, userB, userA);
};

export const sendMessage = (fromId, toId, text) => {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO messages (id, from_id, to_id, text) VALUES (?,?,?,?)
  `).run(id, fromId, toId, text);
  return db.prepare('SELECT * FROM messages WHERE id=?').get(id);
};

export const getInboxPreviews = (userId) =>
  db.prepare(`
    SELECT m.*
    FROM messages m
    INNER JOIN (
      SELECT MAX(created_at) as latest,
        CASE WHEN from_id=? THEN to_id ELSE from_id END as partner_id
      FROM messages WHERE from_id=? OR to_id=?
      GROUP BY partner_id
    ) latest ON m.created_at=latest.latest
      AND (CASE WHEN m.from_id=? THEN m.to_id ELSE m.from_id END)=latest.partner_id
    ORDER BY m.created_at DESC
  `).all(userId, userId, userId, userId);
