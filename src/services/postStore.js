import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, increment, setDoc,
  getDoc, query, orderBy, where,
} from 'firebase/firestore'
import { db } from '../firebase'

function formatTime(ts) {
  if (!ts?.toDate) return 'เมื่อกี้นี้'
  const diff = (Date.now() - ts.toDate().getTime()) / 1000
  if (diff < 60) return 'เมื่อกี้นี้'
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`
  return `${Math.floor(diff / 86400)} วันที่แล้ว`
}

function formatPost(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    content: d.content || '',
    feeling: d.feeling || null,
    location: d.location || null,
    images: d.imageUrl ? [d.imageUrl] : [],
    image: d.imageUrl || null,
    cat: { name: d.authorName, avatar: d.authorAvatar },
    userId: d.authorId,
    time: formatTime(d.createdAt),
    likeCount: d.likeCount || 0,
    commentCount: d.commentCount || 0,
    shareCount: 0,
    myReaction: null,
  }
}

export function subscribePosts(onUpdate) {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map(formatPost))
  })
}

export async function createPost({ content, feeling, imageUrl, currentUser }) {
  await addDoc(collection(db, 'posts'), {
    content,
    feeling: feeling || null,
    imageUrl: imageUrl || null,
    authorId: currentUser.uid,
    authorName: currentUser.activeCat?.name || currentUser.name,
    authorAvatar: currentUser.activeCat?.avatar || currentUser.avatar || '',
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  })
}

export async function deletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId))
}

export async function updatePost(postId, content) {
  await updateDoc(doc(db, 'posts', postId), { content })
}

export async function reactToPost(postId, uid, type, prevType) {
  await setDoc(doc(db, 'posts', postId, 'reactions', uid), { type })
  if (!prevType) {
    await updateDoc(doc(db, 'posts', postId), { likeCount: increment(1) })
  }
}

export async function removeReaction(postId, uid) {
  await deleteDoc(doc(db, 'posts', postId, 'reactions', uid))
  await updateDoc(doc(db, 'posts', postId), { likeCount: increment(-1) })
}

export async function getUserReaction(postId, uid) {
  const snap = await getDoc(doc(db, 'posts', postId, 'reactions', uid))
  return snap.exists() ? snap.data().type : null
}

export function subscribeComments(postId, uid, onUpdate) {
  const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        text: data.text,
        name: data.authorName,
        avatar: data.authorAvatar,
        time: formatTime(data.createdAt),
        meow: data.meow || false,
        isOwn: data.authorId === uid,
      }
    }))
  })
}

export function subscribePostsByUser(uid, onUpdate) {
  const q = query(
    collection(db, 'posts'),
    where('authorId', '==', uid),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, snap => onUpdate(snap.docs.map(formatPost)))
}

export async function addComment(postId, { text, meow, currentUser }) {
  await addDoc(collection(db, 'posts', postId, 'comments'), {
    text,
    meow: meow || false,
    authorId: currentUser.uid,
    authorName: currentUser.activeCat?.name || currentUser.name,
    authorAvatar: currentUser.activeCat?.avatar || currentUser.avatar || '',
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) })
}
