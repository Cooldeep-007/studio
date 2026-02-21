'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      return; // Still checking, do nothing.
    }

    if (!user) {
      // Not authenticated, send to login.
      router.push('/login');
      return;
    }
  }, [user, isUserLoading, router]);

  // While loading auth, or if no user (and about to redirect), show a loader.
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If authenticated, render the children (AppShell), which will handle the profile check.
  return <>{children}</>;
}
