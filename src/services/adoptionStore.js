import {
  collection, doc, addDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'

const col = 'adoptions'

const onErr = (err) => console.error('[Firestore]', err)

export function subscribeAdoptions(onUpdate) {
  const q = query(collection(db, col), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onErr)
}

export async function createAdoption(data) {
  const ref = await addDoc(collection(db, col), { ...data, createdAt: serverTimestamp() })
  return { id: ref.id, ...data }
}

export async function deleteAdoption(id) {
  await deleteDoc(doc(db, col, id))
}
