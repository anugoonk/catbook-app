import {
  collection, doc, addDoc, updateDoc,
  onSnapshot, serverTimestamp, query, orderBy,
  arrayUnion, arrayRemove,
} from 'firebase/firestore'
import { db } from '../firebase'

const col = 'events'

const onErr = (err) => console.error('[Firestore]', err)

export function subscribeEvents(onUpdate) {
  const q = query(collection(db, col), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onErr)
}

export async function createEvent(data) {
  const ref = await addDoc(collection(db, col), { ...data, createdAt: serverTimestamp() })
  return { id: ref.id, ...data }
}

export async function toggleAttend(eventId, uid) {
  const ref = doc(db, col, eventId)
  // read current to decide add/remove — caller passes currentUids for optimistic UI
  return ref
}

export async function attendEvent(eventId, uid) {
  await updateDoc(doc(db, col, eventId), { attendeeUids: arrayUnion(uid) })
}

export async function leaveEvent(eventId, uid) {
  await updateDoc(doc(db, col, eventId), { attendeeUids: arrayRemove(uid) })
}
