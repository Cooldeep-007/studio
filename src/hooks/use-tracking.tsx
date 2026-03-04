'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useAuth } from '@/firebase/provider';

export function useSessionTracking() {
  const { user } = useUser();
  const auth = useAuth();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasSentRef = useRef(false);

  pathnameRef.current = pathname;

  useEffect(() => {
    if (!user || !auth.currentUser) {
      hasSentRef.current = false;
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        await fetch('/api/sessions/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ currentPage: pathnameRef.current }),
        });
      } catch {}
    };

    if (!hasSentRef.current) {
      hasSentRef.current = true;
      sendHeartbeat();
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(sendHeartbeat, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;

    const handleUnload = () => {
      navigator.sendBeacon(
        '/api/sessions/cleanup',
        new Blob([JSON.stringify({})], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user?.uid]);
}

export async function logAuditEvent(data: {
  firebaseUid: string;
  email: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  try {
    await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {}
}
