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
      // Authenticated but no profile, send to signup completion.
      router.push('/signup?flow=g-register');
      return;
    }
  }, [user, profile, isLoading, router]);

  // While loading auth OR if we are about to redirect, show a full-screen loader.
  // This prevents the flicker by not rendering children until we are sure they should be seen.
  if (isLoading || !user || !profile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // If authenticated and profile exists, render the protected content.
  return <>{children}</>;
}
