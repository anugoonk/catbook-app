import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const col = 'carts'

export async function getCart(uid) {
  const snap = await getDoc(doc(db, col, uid))
  return snap.exists() ? snap.data() : { items: [] }
}

export async function saveCart(uid, items) {
  await setDoc(doc(db, col, uid), { items, updatedAt: serverTimestamp() })
}

export async function clearCart(uid) {
  await setDoc(doc(db, col, uid), { items: [], updatedAt: serverTimestamp() })
}
