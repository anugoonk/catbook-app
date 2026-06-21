import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
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

// App Check (reCAPTCHA v3) — blocks API calls from outside the real app.
// Site key is public; enforcement is toggled in the Firebase Console.
const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
if (appCheckSiteKey) {
  // In local dev, use a debug token so reCAPTCHA isn't required.
  // Register the token printed in the console under App Check → Debug tokens.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-undef
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  } catch (e) {
    console.warn('App Check init failed:', e)
  }
}

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export const storage = getStorage(app)
export const rtdb = getDatabase(app)
