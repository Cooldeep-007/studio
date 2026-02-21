
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, profile, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return; // Still checking, do nothing.
    }

    if (!user) {
      // Not authenticated, send to login.
      router.push('/login');
      return;
    }

    if (!profile) {
      // Authenticated but no Firestore profile.
      // This is a new user (likely via Google) who needs to complete setup.
      router.push('/signup?flow=g-register');
      return;
    }
  }, [user, profile, isLoading, router]);

  // While loading, or if we are about to redirect, show a loader.
  if (isLoading || !user || !profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If all checks pass, render the protected content.
  return <>{children}</>;
}
