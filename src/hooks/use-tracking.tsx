'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useAuth } from '@/firebase/provider';

async function getAuthHeaders(auth: any): Promise<HeadersInit> {
  try {
    const user = auth.currentUser;
    if (!user) return { 'Content-Type': 'application/json' };
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

export function useSessionTracking() {
  const { user, profile } = useUser();
  const auth = useAuth();
  const pathname = usePathname();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      try {
        const headers = await getAuthHeaders(auth);
        await fetch('/api/sessions/heartbeat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            currentPage: pathname,
          }),
        });
      } catch (e) {
      }
    };

    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, profile, pathname, auth]);

  useEffect(() => {
    if (!user) return;

    const removeSession = async () => {
      try {
        const headers = await getAuthHeaders(auth);
        await fetch('/api/sessions/heartbeat', {
          method: 'DELETE',
          headers,
          body: JSON.stringify({}),
        });
      } catch {}
    };

    const handleUnload = () => {
      const token = (auth.currentUser as any)?._lat || '';
      if (token) {
        const blob = new Blob(
          [JSON.stringify({})],
          { type: 'application/json' }
        );
        const headers = new Headers({
          'Authorization': `Bearer ${token}`,
        });
        navigator.sendBeacon('/api/sessions/cleanup', blob);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user, auth]);
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
  } catch (e) {
  }
}
