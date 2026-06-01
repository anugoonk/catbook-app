import {
  collection, doc, addDoc, deleteDoc, updateDoc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'

const onErr = (err) => console.error('[Firestore]', err)

export function subscribeListings(onUpdate) {
  const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => { onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() }))) }, onErr)
}

export async function createListing(data) {
  const ref = await addDoc(collection(db, 'listings'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...data }
}

export async function deleteListing(id) {
  await deleteDoc(doc(db, 'listings', id))
}

export async function updateListing(id, fields) {
  await updateDoc(doc(db, 'listings', id), fields)
}
