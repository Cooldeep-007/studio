'use client';

import { useMemo } from 'react';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';

export function useUser() {
  const { firestore, user, isUserLoading: isLoading, userError } = useFirebase();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user]);

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useDoc<UserProfile>(userProfileRef);

  const value = useMemo(
    () => ({
      user,
      profile,
      isLoading: isLoading || isProfileLoading,
      error: userError || profileError,
    }),
    [user, profile, isLoading, isProfileLoading, userError, profileError]
  );

  return value;
}
