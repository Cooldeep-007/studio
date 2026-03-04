'use client';

import { AppShell } from '@/components/app-shell';
import { AuthGuard } from '@/components/auth-guard';
import { useSessionTracking } from '@/hooks/use-tracking';
import { useAuth } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { useCallback } from 'react';

function TrackedApp({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const auth = useAuth();

  const getIdToken = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return '';
    return currentUser.getIdToken();
  }, [auth]);

  useSessionTracking(user?.uid, user ? getIdToken : undefined);

  return <AppShell>{children}</AppShell>;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <TrackedApp>{children}</TrackedApp>
    </AuthGuard>
  );
}
