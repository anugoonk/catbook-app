import { randomUUID } from 'node:crypto';
import { db } from './database.js';

const formatTime = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'เมื่อกี้นี้';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  return new Date(isoString).toLocaleDateString('th-TH');
};

const rowToPost = (row) => {
  const cat = row.active_cat_json ? JSON.parse(row.active_cat_json) : {};
  return {
    id: row.id,
    userId: row.user_id,
    cat: { id: cat.id, name: cat.name, avatar: cat.avatar, breed: cat.breed },
    content: row.content || '',
    feeling: row.feeling || null,
    location: row.location || null,
    image: row.image_url || null,
    images: row.image_url ? [row.image_url] : [],
    likeCount: Number(row.like_count) || 0,
    myReaction: row.my_reaction || null,
    isLiked: !!row.my_reaction,
    commentCount: Number(row.comment_count) || 0,
    shareCount: 0,
    hidden: Boolean(row.hidden),
    time: formatTime(row.created_at),
    createdAt: row.created_at,
  };
};

const POST_SELECT = (extraWhere = '') => `
  SELECT
    p.id, p.user_id, p.content, p.feeling, p.location, p.image_url, p.hidden, p.created_at,
    u.active_cat_json,
    (SELECT COUNT(*) FROM post_reactions WHERE post_id = p.id) AS like_count,
    (SELECT reaction_type FROM post_reactions WHERE post_id = p.id AND user_id = ?) AS my_reaction,
    (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) AS comment_count
  FROM posts p
  LEFT JOIN users u ON u.id = p.user_id
  ${extraWhere}
  ORDER BY p.created_at DESC
`;

export const listPosts = (currentUserId) => {
  const rows = db.prepare(POST_SELECT('WHERE p.hidden = 0')).all(currentUserId);
  return rows.map(rowToPost);
};

export const listAdminPosts = () => {
  const rows = db.prepare(POST_SELECT()).all('');
  return rows.map(rowToPost);
};

export const createPost = (userId, { content, feeling, location, imageUrl }) => {
  const id = `p-${randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO posts (id, user_id, content, feeling, location, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, content || '', feeling || null, location || null, imageUrl || null, now);
  const row = db.prepare(`
    SELECT p.id, p.user_id, p.content, p.feeling, p.location, p.image_url, p.created_at,
      u.active_cat_json,
      0 AS like_count, NULL AS my_reaction, 0 AS comment_count
    FROM posts p LEFT JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `).get(id);
  return rowToPost(row);
};

export const deletePost = (postId, userId) => {
  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId);
  if (!post) return { error: { status: 404, message: 'Post not found' } };
  if (post.user_id !== userId) return { error: { status: 403, message: 'Not your post' } };
  db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
  return { ok: true };
};

export const upsertReaction = (postId, userId, reactionType) => {
  if (!db.prepare('SELECT id FROM posts WHERE id = ?').get(postId)) {
    return { error: { status: 404, message: 'Post not found' } };
  }
  db.prepare(`
    INSERT INTO post_reactions (post_id, user_id, reaction_type)
    VALUES (?, ?, ?)
    ON CONFLICT(post_id, user_id) DO UPDATE SET reaction_type = excluded.reaction_type
  `).run(postId, userId, reactionType);
  const likeCount = db.prepare('SELECT COUNT(*) AS cnt FROM post_reactions WHERE post_id = ?').get(postId).cnt;
  return { ok: true, likeCount, myReaction: reactionType };
};

export const removeReaction = (postId, userId) => {
  db.prepare('DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?').run(postId, userId);
  const likeCount = db.prepare('SELECT COUNT(*) AS cnt FROM post_reactions WHERE post_id = ?').get(postId).cnt;
  return { ok: true, likeCount, myReaction: null };
};

export const listComments = (postId, currentUserId) => {
  const rows = db.prepare(`
    SELECT pc.id, pc.post_id, pc.user_id, pc.text, pc.meow, pc.created_at,
      u.active_cat_json
    FROM post_comments pc
    LEFT JOIN users u ON u.id = pc.user_id
    WHERE pc.post_id = ?
    ORDER BY pc.created_at ASC
  `).all(postId);
  return rows.map(row => {
    const cat = row.active_cat_json ? JSON.parse(row.active_cat_json) : {};
    return {
      id: row.id,
      userId: row.user_id,
      name: cat.name || '',
      avatar: cat.avatar || '',
      text: row.text,
      meow: Boolean(row.meow),
      time: formatTime(row.created_at),
      isOwn: row.user_id === currentUserId,
    };
  });
};

export const createComment = (postId, userId, { text, meow = false }) => {
  if (!db.prepare('SELECT id FROM posts WHERE id = ?').get(postId)) {
    return { error: { status: 404, message: 'Post not found' } };
  }
  const id = `cm-${randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO post_comments (id, post_id, user_id, text, meow, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, postId, userId, text, meow ? 1 : 0, now);
  const userRow = db.prepare('SELECT active_cat_json FROM users WHERE id = ?').get(userId);
  const cat = userRow ? JSON.parse(userRow.active_cat_json) : {};
  return { id, userId, name: cat.name || '', avatar: cat.avatar || '', text, meow, time: 'เมื่อกี้นี้', isOwn: true };
};

export const toggleFollow = (followerId, followeeId) => {
  if (followerId === followeeId) return { error: { status: 400, message: 'Cannot follow yourself' } };
  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(followerId, followeeId);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(followerId, followeeId);
    return { following: false };
  }
  db.prepare('INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)').run(followerId, followeeId, new Date().toISOString());
  return { following: true };
};

export const updatePost = (postId, userId, content) => {
  const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId);
  if (!post) return { error: { status: 404, message: 'Post not found' } };
  if (post.user_id !== userId) return { error: { status: 403, message: 'Not your post' } };
  db.prepare('UPDATE posts SET content = ? WHERE id = ?').run(content, postId);
  return { ok: true };
};

export const deletePostAdmin = (postId) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return { error: { status: 404, message: 'Post not found' } };
  db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
  return { ok: true };
};

export const setPostHidden = (postId, hidden) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return { error: { status: 404, message: 'Post not found' } };
  db.prepare('UPDATE posts SET hidden = ? WHERE id = ?').run(hidden ? 1 : 0, postId);
  return { ok: true, hidden };
};

export const seedMockPosts = () => {
  const seeds = [
    // ── original 3 ──────────────────────────────────────────────────────────
    { id: 'p1',  userId: 'u3', ago: 10 * 60000,
      content: 'วันนี้แอบนอนในกล่องรองเท้าอีกแล้ว เมี๊ยววว 📦💤',
      feeling: 'ง่วงนอน', location: 'บ้านอันแสนอบอุ่น',
      imageUrl: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80' },
    { id: 'p2',  userId: 'u4', ago: 2 * 3600000,
      content: 'ทาสซื้ออาหารเม็ดรสใหม่มาให้ ชิมแล้วให้ 10/10 ไปเลยฮะ! 🐟✨',
      feeling: 'อารมณ์ดี', location: null, imageUrl: null },
    { id: 'p3',  userId: 'u2', ago: 5 * 3600000,
      content: 'นั่งรอทาสกลับบ้านเมื่อไหร่จะมาเทข้าววววว 😾',
      feeling: 'หิวมาก', location: null,
      imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80' },

    // ── new varied posts ─────────────────────────────────────────────────────
    { id: 'p4',  userId: 'u1', ago: 30 * 60000,
      content: 'ตรวจสอบระบบ CatBook เรียบร้อยแล้ว ทุกอย่างโอเค ขอกลับไปนอนต่อนะ 🛡️😴',
      feeling: 'เหนื่อยแต่โอเค', location: 'สำนักงานบอส',
      imageUrl: null },
    { id: 'p5',  userId: 'u2', ago: 1.5 * 3600000,
      content: 'กล่องพัสดุมาส่งแล้ว!! 📦 นี่คือที่นอนของฉัน ทาสอย่าแตะ หากแตะจะโดนข่วน',
      feeling: 'ดีใจมาก', location: 'หน้าบ้าน',
      imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&q=80' },
    { id: 'p6',  userId: 'u3', ago: 3 * 3600000,
      content: 'จับจิ้งจกได้ 1 ตัวแล้ววันนี้ 😼🦎 ฝีมือดีขึ้นเรื่อยๆ ทาสควรภูมิใจในตัวฉัน',
      feeling: 'ภาคภูมิใจ', location: 'ระเบียงหลังบ้าน', imageUrl: null },
    { id: 'p7',  userId: 'u4', ago: 4 * 3600000,
      content: 'วิ่งรอบบ้าน 10 รอบตอนตีสาม โดยไม่มีเหตุผล แค่รู้สึกอยากวิ่ง 🏃💨\n\nทาสตกใจมากมาย ฮ่าๆ',
      feeling: 'ซนมาก', location: null, imageUrl: null },
    { id: 'p8',  userId: 'u2', ago: 6 * 3600000,
      content: 'อาบน้ำแล้ววววว 💧😾 ฉุนมากกก ทำไมต้องอาบน้ำด้วย ขนเปียกหมด ชีวิตแย่ที่สุด\n\n#ต่อต้านการอาบน้ำ #แมวโกรธ',
      feeling: 'โกรธมาก', location: 'ห้องน้ำที่เกลียด',
      imageUrl: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=600&q=80' },
    { id: 'p9',  userId: 'u3', ago: 7 * 3600000,
      content: 'นอนบน laptop ทาสได้สำเร็จ ขัดขวางการทำงานได้อย่างมีประสิทธิภาพ 💻😸\n\nทาสขอพื้นที่คืน แต่ฉันไม่ยอม',
      feeling: 'พอใจในตัวเอง', location: 'โต๊ะทำงานทาส', imageUrl: null },
    { id: 'p10', userId: 'u4', ago: 9 * 3600000,
      content: 'วันนี้ปลาทูน่าอร่อยมากกก 🐟🐟🐟 ให้ 5 ดาวเต็ม ทาสรู้ใจจริงๆ\n\nถ้าพรุ่งนี้ได้อีกจะให้โบนัสยิ้มหนึ่งครั้ง',
      feeling: 'อิ่มและมีความสุข', location: null,
      imageUrl: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&q=80' },
    { id: 'p11', userId: 'u1', ago: 11 * 3600000,
      content: 'ตรวจพบหมาบ้านข้างเดินผ่านหน้าบ้าน 🚨🐕 ส่งเสียงเตือนภัยแล้ว เขตแดนของเมี๊ยวห้ามละเมิด!\n\nป.ล. หมาตัวนั้นดูหวาดกลัวดีมาก',
      feeling: 'ตื่นตัว', location: 'หน้าต่างชั้น 2', imageUrl: null },
    { id: 'p12', userId: 'u2', ago: 14 * 3600000,
      content: 'นอนกลางแดดอุ่นๆ ริมหน้าต่าง ☀️😌 ชีวิตดี ไม่ต้องทำอะไร ทาสทำงานไป ฉันจะนอน\n\nนี่แหละคือชีวิตที่สมบูรณ์แบบ',
      feeling: 'ผ่อนคลาย', location: 'หน้าต่างแสงแดด',
      imageUrl: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600&q=80' },
    { id: 'p13', userId: 'u3', ago: 18 * 3600000,
      content: 'ทาสพยายามให้ยา ฉันสู้กลับทุกครั้ง 💊❌ ยังไม่แพ้สักทีเลยนะ ชนะมา 7 รอบติดต่อกัน\n\nทาสไม่มีวันชนะฉันได้หรอก 😼',
      feeling: 'ภูมิใจมาก', location: null, imageUrl: null },
    { id: 'p14', userId: 'u4', ago: 22 * 3600000,
      content: 'เพิ่งค้นพบว่าถ้านอนตรงกลาง sofa ทาสจะไม่มีที่นั่ง 🛋️😂\n\nทดสอบซ้ำ 3 ครั้ง ผลเหมือนเดิมทุกครั้ง งานวิจัยสำเร็จ!',
      feeling: 'ค้นพบสิ่งใหม่', location: 'โซฟาของฉัน',
      imageUrl: 'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=600&q=80' },
    { id: 'p15', userId: 'u1', ago: 26 * 3600000,
      content: 'ประกาศ: ตั้งแต่วันนี้เป็นต้นไป เวลาให้อาหารทุกวันต้องตรงเวลา ไม่งั้นจะปลุกทาสตี 4 ทุกคืน 😾\n\nลงชื่อ: บอส (ผู้พิทักษ์ตู้เย็น)',
      feeling: 'จริงจัง', location: 'ห้องประชุมแมว', imageUrl: null },
  ];

  // Insert only missing seed posts (additive, never delete existing)
  const stmt = db.prepare('INSERT OR IGNORE INTO posts (id, user_id, content, feeling, location, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const s of seeds) {
    const createdAt = new Date(Date.now() - s.ago).toISOString();
    stmt.run(s.id, s.userId, s.content, s.feeling ?? null, s.location ?? null, s.imageUrl ?? null, createdAt);
  }
};
