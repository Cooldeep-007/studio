'use client';

import { AppShell } from '@/components/app-shell';
import { AuthGuard } from '@/components/auth-guard';
import { useSessionTracking } from '@/hooks/use-tracking';

function TrackedApp({ children }: { children: React.ReactNode }) {
  useSessionTracking();
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
