import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)

export const firebaseSignOut = () => signOut(auth)

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback)
