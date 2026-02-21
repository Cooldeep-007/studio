
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

    // This user is the first one, so they are the Owner.
    // Their company becomes the firm.
    const firmId = `firm-${user.uid}`;
    
    // Create the Firm document
    await createFirm(firmId, user.uid, formData.companyName);

    // Create user profile and link it to the new firm
    await createUserProfile(user.uid, {
      name: formData.name,
      email: user.email!,
      companyName: formData.companyName,
      mobile: formData.mobile,
      role: 'Owner', // First user is the Owner
    }, firmId);

    return null;
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function completeGoogleSignup(formData: {
  companyName: string;
  mobile: string;
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
      name: user.displayName || 'New User',
      email: user.email!,
      companyName: formData.companyName,
      mobile: formData.mobile,
      role: 'Owner',
    }, firmId);

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
    await signInWithPopup(auth, provider);
    // After popup, the onAuthStateChanged listener will trigger.
    // Our AuthGuard will then detect if it's a new user (auth object exists, but no firestore profile)
    // and redirect them to the completion step.
    return null;
  } catch (error: any) {
    // If the user closes the popup, it's not a true "error" we need to display.
    if (error.code === 'auth/popup-closed-by-user') {
      return null;
    }
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
