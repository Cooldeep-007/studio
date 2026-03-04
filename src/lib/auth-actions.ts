
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { UserProfile } from './types';

export type AuthError = {
  code: string;
  message: string;
};

function logAuthEventServer(
  eventType: string,
  data: { firebaseUid?: string; email?: string; displayName?: string; metadata?: Record<string, any> }
) {
  fetch('/api/auth/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firebaseUid: data.firebaseUid || null,
      email: data.email || null,
      displayName: data.displayName || null,
      eventType,
      metadata: data.metadata || {},
    }),
  }).catch(() => {});
}

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
      case 'auth/operation-not-allowed':
        errorMessage = 'Operation not allowed. Please enable Email/Password and Google sign-in methods in your Firebase Console -> Authentication -> Sign-in method tab.';
        break;
      case 'auth/popup-closed-by-user':
        // This is not a "failure" error, so we can handle it gracefully.
        errorMessage = 'Sign-in process was cancelled.';
        break;
      default:
        errorMessage = error.message;
        break;
    }
  }
  return { code: errorCode, message: errorMessage };
}

// Create User Profile in Firestore
async function createUserProfile(uid: string, data: Omit<UserProfile, 'uid' | 'createdAt' | 'firmId'>, firmId: string) {
  const userProfileRef = doc(firestore, `users/${uid}`);
  await setDoc(userProfileRef, {
    uid,
    firmId,
    ...data,
    role: 'Owner', // Default role for new sign-ups
    firstLogin: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Create Firm document in Firestore
async function createFirm(firmId: string, ownerId: string, firmName: string) {
    const firmRef = doc(firestore, `firms/${firmId}`);
    await setDoc(firmRef, {
        id: firmId,
        firmName: firmName,
        ownerId: ownerId,
        planType: 'Free',
        subscriptionStatus: 'Trial',
        maxUsers: 5,
        maxVouchersPerMonth: 100,
        renewalDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30-day trial
        isActive: true,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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

    const firmId = `firm-${user.uid}`;
    
    await createFirm(firmId, user.uid, formData.companyName);

    await createUserProfile(user.uid, {
      name: formData.name,
      email: user.email!,
      companyName: formData.companyName,
      mobile: formData.mobile,
      role: 'Owner',
    }, firmId);

    logAuthEventServer('signup', { firebaseUid: user.uid, email: user.email!, displayName: formData.name });

    return null;
  } catch (error) {
    const authError = handleAuthError(error);
    logAuthEventServer('signup_failed', { email: formData.email, metadata: { error: authError.code } });
    return authError;
  }
}

export async function completeGoogleSignup(formData: {
  companyName: string;
  mobile: string;
  name: string;
  email: string;
}): Promise<AuthError | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { code: 'auth/no-user', message: 'No authenticated user found. Please sign in again.' };
    }

    // Check if profile already exists, just in case.
    const userProfileRef = doc(firestore, `users/${user.uid}`);
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
        return { code: 'auth/profile-exists', message: 'A profile for this user already exists.' };
    }

    const firmId = `firm-${user.uid}`;
    
    await createFirm(firmId, user.uid, formData.companyName);

    await createUserProfile(user.uid, {
      name: formData.name,
      email: formData.email,
      companyName: formData.companyName,
      mobile: formData.mobile,
      role: 'Owner',
    }, firmId);

    logAuthEventServer('signup', { firebaseUid: user.uid, email: formData.email, displayName: formData.name });

    return null;
  } catch (error) {
    const authError = handleAuthError(error);
    logAuthEventServer('signup_failed', { email: formData.email, metadata: { error: authError.code } });
    return authError;
  }
}

// Sign in with Email and Password
export async function signInWithEmail(email: string, password: string): Promise<AuthError | null> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    logAuthEventServer('login', { firebaseUid: userCredential.user.uid, email: userCredential.user.email!, displayName: userCredential.user.displayName || '' });
    return null;
  } catch (error) {
    const authError = handleAuthError(error);
    logAuthEventServer('login_failed', { email, metadata: { error: authError.code } });
    return authError;
  }
}

// Sign in with Google
export async function signInWithGoogle(): Promise<AuthError | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    logAuthEventServer('login', { firebaseUid: result.user.uid, email: result.user.email!, displayName: result.user.displayName || '' });
    return null;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      return null;
    }
    const authError = handleAuthError(error);
    logAuthEventServer('login_failed', { metadata: { error: authError.code } });
    return authError;
  }
}

// Sign out
export async function signOut(): Promise<AuthError | null> {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      logAuthEventServer('logout', { firebaseUid: currentUser.uid, email: currentUser.email! });
    }
    await firebaseSignOut(auth);
    return null;
  } catch (error) {
    return handleAuthError(error);
  }
}
