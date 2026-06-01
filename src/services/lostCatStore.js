import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'

const col = 'lostcats'

const onErr = (err) => console.error('[Firestore]', err)

export function subscribeLostCats(onUpdate) {
  const q = query(collection(db, col), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onErr)
}

export async function createLostCat(data) {
  const ref = await addDoc(collection(db, col), { ...data, createdAt: serverTimestamp() })
  return { id: ref.id, ...data }
}

export async function updateLostCatStatus(id, status) {
  await updateDoc(doc(db, col, id), { status })
}

export async function deleteLostCat(id) {
  await deleteDoc(doc(db, col, id))
}
