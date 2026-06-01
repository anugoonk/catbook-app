import {
  collection, doc, addDoc, updateDoc, getDoc,
  onSnapshot, serverTimestamp, query, orderBy, where,
} from 'firebase/firestore'
import { db } from '../firebase'

const col = 'orders'

export async function createOrder(uid, data) {
  const ref = await addDoc(collection(db, col), {
    ...data,
    buyerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getOrder(orderId) {
  const snap = await getDoc(doc(db, col, orderId))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    id: snap.id,
    ...d,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
    updatedAt: d.updatedAt?.toDate?.() ?? new Date(),
  }
}

export function subscribeUserOrders(uid, onUpdate) {
  const q = query(collection(db, col), where('buyerUid', '==', uid), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => onUpdate(snap.docs.map(formatOrder)))
}

export function subscribeAllOrders(onUpdate) {
  const q = query(collection(db, col), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => onUpdate(snap.docs.map(formatOrder)))
}

export async function updateOrder(orderId, fields) {
  await updateDoc(doc(db, col, orderId), { ...fields, updatedAt: serverTimestamp() })
}

export async function cancelOrder(orderId, reason = '') {
  await updateDoc(doc(db, col, orderId), {
    status: 'cancelled',
    cancelReason: reason,
    updatedAt: serverTimestamp(),
  })
}

function formatOrder(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    ...d,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
    updatedAt: d.updatedAt?.toDate?.() ?? new Date(),
  }
}
