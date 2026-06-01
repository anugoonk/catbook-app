import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyBDzZB5IlAV8WPWNdgb2879w16p-fHf12o",
  authDomain: "catbook-8aa86.firebaseapp.com",
  projectId: "catbook-8aa86",
  storageBucket: "catbook-8aa86.appspot.com",
  messagingSenderId: "148859724843",
  appId: "1:148859724843:web:9a67a61dd06ce131ec366e",
  databaseURL: "https://catbook-8aa86-default-rtdb.asia-southeast1.firebasedatabase.app",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export const storage = getStorage(app)
export const rtdb = getDatabase(app)
