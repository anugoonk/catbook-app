import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '../firebase'

const usersCol = 'users'
const ADMIN_EMAILS = ['anugoonk@gmail.com']

export async function getOrCreateUser(firebaseUser) {
  const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email)
  const ref = doc(db, usersCol, firebaseUser.uid)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    return { uid: firebaseUser.uid, ...snap.data() }
  }

  const newUser = {
    name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
    email: firebaseUser.email,
    avatar: firebaseUser.photoURL || '',
    role: isAdmin ? 'ADMIN' : 'USER',
    isAdmin,
    profileComplete: false,
    activeCat: {
      name: '',
      avatar: firebaseUser.photoURL || '',
      breed: '',
      bio: '',
    },
    createdAt: new Date().toISOString(),
  }

  await setDoc(ref, newUser)
  return { uid: firebaseUser.uid, ...newUser }
}

export async function updateUserProfile(uid, fields) {
  const ref = doc(db, usersCol, uid)
  await updateDoc(ref, fields)
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, usersCol))
  return snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }))
}

let _fetchPromise = null
export function getCachedUsers() {
  if (!_fetchPromise) _fetchPromise = getAllUsers()
  return _fetchPromise
}
export function clearUsersCache() { _fetchPromise = null }

export async function setUserRole(uid, role) {
  await updateDoc(doc(db, usersCol, uid), {
    role,
    isAdmin: role === 'ADMIN',
  })
}

export async function setUserStatus(uid, status) {
  await updateDoc(doc(db, usersCol, uid), { status })
}

export async function deleteUserDoc(uid) {
  await deleteDoc(doc(db, usersCol, uid))
}

export async function followUser(myUid, targetUid) {
  await setDoc(doc(db, 'follows', `${myUid}_${targetUid}`), {
    followerUid: myUid,
    followedUid: targetUid,
    createdAt: new Date().toISOString(),
  })
}

export async function unfollowUser(myUid, targetUid) {
  await deleteDoc(doc(db, 'follows', `${myUid}_${targetUid}`))
}

export async function getFollowing(myUid) {
  const q = query(collection(db, 'follows'), where('followerUid', '==', myUid))
  const snap = await getDocs(q)
  return new Set(snap.docs.map(d => d.data().followedUid))
}

export async function completeProfile(uid, { catName, breed, bio, avatar, cover, email, name }) {
  const ref = doc(db, usersCol, uid)
  const data = {
    profileComplete: true,
    activeCat: {
      name: catName,
      breed: breed || '',
      bio: bio || '',
      avatar,
      cover: cover || '',
    },
  }
  if (email) data.email = email
  if (name) data.name = name
  await setDoc(ref, data, { merge: true })
}
