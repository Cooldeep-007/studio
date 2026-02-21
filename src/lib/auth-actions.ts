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
    createdAt: serverTimestamp(),
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

    const userProfileRef = doc(firestore, `users/${user.uid}`);
    const docSnap = await getDoc(userProfileRef);

    if (!docSnap.exists()) {
      // New Google sign-in user becomes an Owner of their own new firm
      const firmId = `firm-${user.uid}`;
      const companyName = `${user.displayName}'s Company`;

      await createFirm(firmId, user.uid, companyName);

      await createUserProfile(user.uid, {
        name: user.displayName || 'Google User',
        email: user.email!,
        companyName: companyName,
        mobile: user.phoneNumber || '',
        role: 'Owner',
      }, firmId);
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
