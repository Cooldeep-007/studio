'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, profile, isLoading } = useUser();
  const [profileWaitDone, setProfileWaitDone] = useState(false);
  const profileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      window.location.replace('/login');
      return;
    }

    if (profile) {
      setProfileWaitDone(false);
      if (profileTimerRef.current) {
        clearTimeout(profileTimerRef.current);
        profileTimerRef.current = null;
      }
      return;
    }

    if (!profile && !profileWaitDone) {
      if (!profileTimerRef.current) {
        profileTimerRef.current = setTimeout(() => {
          setProfileWaitDone(true);
          profileTimerRef.current = null;
        }, 3000);
      }
      return;
    }

    if (!profile && profileWaitDone) {
      window.location.replace('/signup?flow=g-register');
    }
  }, [user, profile, isLoading, profileWaitDone]);

  useEffect(() => {
    return () => {
      if (profileTimerRef.current) {
        clearTimeout(profileTimerRef.current);
      }
    };
  }, []);

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
