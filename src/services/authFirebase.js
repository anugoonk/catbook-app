import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

// In-app browsers (Facebook, Instagram, LINE, Messenger, TikTok…) block popups
// and often the OS webview can't run Google OAuth at all.
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || ''
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|MicroMessenger|TikTok|Twitter/i.test(ua)
}

export async function signInWithGoogle() {
  // In webviews, popup never works — go straight to redirect.
  if (isInAppBrowser()) {
    return signInWithRedirect(auth, googleProvider)
  }
  try {
    return await signInWithPopup(auth, googleProvider)
  } catch (err) {
    // Popup blocked / unsupported → fall back to full-page redirect.
    const redirectCodes = [
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ]
    if (redirectCodes.includes(err?.code)) {
      return signInWithRedirect(auth, googleProvider)
    }
    throw err
  }
}

// Completes a redirect sign-in when the app loads after returning from Google.
export const completeRedirectSignIn = () => getRedirectResult(auth)

export const firebaseSignOut = () => signOut(auth)

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback)
