'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, profile, isLoading } = useUser();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        window.location.replace('/login');
      }
      return;
    }

    if (!profile) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        window.location.replace('/signup?flow=g-register');
      }
      return;
    }

    hasRedirected.current = false;
  }, [user, profile, isLoading]);

  if (isLoading || !user || !profile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
