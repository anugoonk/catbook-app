import { ref, push, onValue, off, update, increment, set } from 'firebase/database'
import { rtdb } from '../firebase'

const getRoomId = (uid1, uid2) => [uid1, uid2].sort().join('_')

export function subscribeUnread(myUid, onUpdate) {
  const inboxRef = ref(rtdb, `inboxes/${myUid}`)
  onValue(inboxRef, (snap) => {
    const data = snap.val() || {}
    const total = Object.values(data).reduce((sum, v) => sum + (v?.count || 0), 0)
    const senders = Object.entries(data)
      .filter(([, v]) => v?.count > 0)
      .map(([uid, v]) => ({ uid, name: v.senderName || '', avatar: v.senderAvatar || '', lastMessage: v.lastMessage || '', lastTime: v.lastTime || 0 }))
      .sort((a, b) => b.lastTime - a.lastTime)
    onUpdate(total, senders)
  })
  return () => off(inboxRef)
}

export async function clearUnread(myUid, partnerUid) {
  await set(ref(rtdb, `inboxes/${myUid}/${partnerUid}`), { count: 0 })
}

export function subscribeMessages(myUid, partnerUid, onUpdate) {
  const roomId = getRoomId(myUid, partnerUid)
  const msgsRef = ref(rtdb, `chats/${roomId}/messages`)

  onValue(msgsRef, (snap) => {
    const data = snap.val() || {}
    const messages = Object.entries(data)
      .map(([id, m]) => ({
        id,
        from: m.from === myUid ? 'me' : m.from,
        text: m.text || '',
        time: new Date(m.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        reactions: m.reactions || {},
        deleted: m.deleted || false,
        type: m.type || 'text',
        img: m.img || null,
        replyTo: m.replyTo || null,
        _ts: m.createdAt,
      }))
      .sort((a, b) => a._ts - b._ts)
    onUpdate(messages)
  })

  return () => off(msgsRef)
}

export async function sendMessage(myUid, partnerUid, { text, type = 'text', img = null, replyTo = null, senderName = '', senderAvatar = '' }) {
  const roomId = getRoomId(myUid, partnerUid)
  await push(ref(rtdb, `chats/${roomId}/messages`), {
    from: myUid,
    text,
    type,
    img,
    replyTo,
    createdAt: Date.now(),
    deleted: false,
    reactions: {},
  })
  await update(ref(rtdb, `inboxes/${partnerUid}/${myUid}`), {
    count: increment(1),
    senderName,
    senderAvatar,
    lastMessage: text,
    lastTime: Date.now(),
  })
}

export async function deleteMessage(myUid, partnerUid, messageId) {
  const roomId = getRoomId(myUid, partnerUid)
  await update(ref(rtdb, `chats/${roomId}/messages/${messageId}`), { deleted: true, text: '' })
}

export async function reactMessage(myUid, partnerUid, messageId, emoji) {
  const roomId = getRoomId(myUid, partnerUid)
  const path = `chats/${roomId}/messages/${messageId}/reactions/${emoji}_${myUid}`
  await update(ref(rtdb, `chats/${roomId}/messages/${messageId}/reactions`), {
    [`${emoji}_${myUid}`]: true,
  })
}
