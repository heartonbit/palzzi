/**
 * Firebase Google Auth module for Palzzi
 * Provides signIn, signOut, and onAuthStateChanged helpers
 */
import { auth, googleProvider } from './config.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';

/**
 * Sign in with Google via popup.
 * Returns the user object on success, throws on failure.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') {
      console.log('Sign-in popup closed by user.');
      return null;
    }
    console.error('Google sign-in error:', err);
    throw err;
  }
}

/**
 * Sign out the current user.
 */
export async function signOutUser() {
  await signOut(auth);
}

/**
 * Subscribe to auth state changes.
 * Callback receives (user) where user is null when not signed in.
 * Returns unsubscribe function.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current user synchronously (may be null).
 */
export function getCurrentUser() {
  return auth.currentUser;
}
