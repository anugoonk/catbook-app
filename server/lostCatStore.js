import { randomUUID } from 'node:crypto';
import { db } from './database.js';

const nextId = () => `lc-${randomUUID()}`;

const rowToLostCat = (row) => ({
  id: row.id,
  userId: row.user_id || null,
  name: row.cat_name,
  lastSeen: row.last_seen,
  location: row.location,
  reward: Number(row.reward) || 0,
  img: row.image_url || '',
  status: row.status || 'active',
  createdAt: row.created_at,
});

export const listLostCats = (statusFilter = 'active') => {
  const rows = statusFilter === 'all'
    ? db.prepare('SELECT * FROM lost_cats ORDER BY created_at DESC').all()
    : db.prepare('SELECT * FROM lost_cats WHERE status = ? ORDER BY created_at DESC').all(statusFilter);
  return rows.map(rowToLostCat);
};

export const createLostCat = (userId, payload) => {
  const catName = String(payload.name || payload.catName || '').trim();
  const lastSeen = String(payload.lastSeen || '').trim();
  const location = String(payload.location || '').trim();
  const reward = Number(payload.reward ?? 0);
  const imageUrl = String(payload.img || payload.imageUrl || '').trim();

  if (!catName) return { error: { status: 400, message: 'Cat name is required' } };
  if (!lastSeen) return { error: { status: 400, message: 'Last seen date is required' } };
  if (!location) return { error: { status: 400, message: 'Location is required' } };

  const id = nextId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO lost_cats (id, user_id, cat_name, last_seen, location, reward, image_url, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(id, userId || null, catName, lastSeen, location, reward, imageUrl || null, now);
  return { lostCat: rowToLostCat(db.prepare('SELECT * FROM lost_cats WHERE id = ?').get(id)) };
};

export const updateLostCatStatus = (id, status) => {
  const allowed = new Set(['active', 'found', 'closed']);
  if (!allowed.has(status)) return { error: { status: 400, message: 'Invalid status' } };
  const row = db.prepare('SELECT id FROM lost_cats WHERE id = ?').get(id);
  if (!row) return { error: { status: 404, message: 'Report not found' } };
  db.prepare('UPDATE lost_cats SET status = ? WHERE id = ?').run(status, id);
  return { lostCat: rowToLostCat(db.prepare('SELECT * FROM lost_cats WHERE id = ?').get(id)) };
};

export const deleteLostCat = (id) => {
  const row = db.prepare('SELECT id FROM lost_cats WHERE id = ?').get(id);
  if (!row) return { error: { status: 404, message: 'Report not found' } };
  db.prepare('DELETE FROM lost_cats WHERE id = ?').run(id);
  return { ok: true };
};

export const seedLostCats = () => {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM lost_cats').get().cnt;
  if (count > 0) return;
  const seeds = [
    { id: 'l1', userId: 'u4', catName: 'น้องส้ม',  lastSeen: '14 พ.ค. 2568', location: 'ลาดพร้าว กทม.',           reward: 5000, imageUrl: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400&q=80' },
    { id: 'l2', userId: 'u3', catName: 'มิวมิว',   lastSeen: '12 พ.ค. 2568', location: 'สีลม กทม.',               reward: 3000, imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80' },
    { id: 'l3', userId: 'u2', catName: 'เจ้าขาว',  lastSeen: '10 พ.ค. 2568', location: 'นิมมานเหมินทร์ เชียงใหม่', reward: 2000, imageUrl: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400&q=80' },
    { id: 'l4', userId: 'u1', catName: 'บอสใหญ่',  lastSeen: '8 พ.ค. 2568',  location: 'ปิ่นเกล้า กทม.',          reward: 8000, imageUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&q=80' },
  ];
  const stmt = db.prepare(`INSERT OR IGNORE INTO lost_cats (id, user_id, cat_name, last_seen, location, reward, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const s of seeds) {
    stmt.run(s.id, s.userId, s.catName, s.lastSeen, s.location, s.reward, s.imageUrl, new Date().toISOString());
  }
};
