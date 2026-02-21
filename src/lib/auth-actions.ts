'use server';

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { UserProfile } from './types';

export type AuthError = {
  code: string;
  message: string;
};

// Initialize Firebase services
const { auth, firestore } = initializeFirebase();

// Helper to handle Firebase errors
function handleAuthError(error: any): AuthError {
  console.error('Firebase Auth Error:', error);
  // Default error
  let errorCode = 'auth/unknown-error';
  let errorMessage = 'An unknown error occurred. Please try again.';

  if (error.code) {
    errorCode = error.code;
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Please enter a valid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        errorMessage = 'Invalid email or password.';
        break;
      case 'auth/email-already-in-use':
        errorMessage = 'This email address is already in use by another account.';
        break;
      case 'auth/weak-password':
        errorMessage = 'The password is too weak. Please use at least 8 characters.';
        break;
      default:
        errorMessage = error.message;
        break;
    }
  }
  return { code: errorCode, message: errorMessage };
}

// Create User Profile in Firestore
async function createUserProfile(uid: string, data: Omit<UserProfile, 'uid' | 'createdAt'>) {
  const userProfileRef = doc(firestore, `users/${uid}`);
  await setDoc(userProfileRef, {
    uid,
    ...data,
    createdAt: serverTimestamp(),
  });
}

// Sign up with Email and Password
export async function signUpWithEmail(formData: {
  email: string;
  password: string;
  name: string;
  companyName: string;
  mobile: string;
}): Promise<AuthError | null> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    const user = userCredential.user;

    // Create user profile
    await createUserProfile(user.uid, {
      name: formData.name,
      email: user.email!,
      companyName: formData.companyName,
      mobile: formData.mobile,
      role: 'FirmAdmin', // Default role
      firmId: `firm-${user.uid}`, // Simple firm ID generation
    });

    return null;
  } catch (error) {
    return handleAuthError(error);
  }
}

// Sign in with Email and Password
export async function signInWithEmail(email: string, password: string): Promise<AuthError | null> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return null;
  } catch (error) {
    return handleAuthError(error);
  }
}

// Sign in with Google
export async function signInWithGoogle(): Promise<AuthError | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user profile already exists, if not, create one
    const userProfileRef = doc(firestore, `users/${user.uid}`);
    const { getDoc } = await import('firebase/firestore');
    const docSnap = await getDoc(userProfileRef);

    if (!docSnap.exists()) {
      await createUserProfile(user.uid, {
        name: user.displayName || 'Google User',
        email: user.email!,
        companyName: `${user.displayName}'s Company`,
        mobile: user.phoneNumber || '',
        role: 'FirmAdmin',
        firmId: `firm-${user.uid}`,
      });
    }
    return null;
  } catch (error) {
    return handleAuthError(error);
  }
}

// Sign out
export async function signOut(): Promise<AuthError | null> {
  try {
    await firebaseSignOut(auth);
    return null;
  } catch (error) {
    return handleAuthError(error);
  }
}
