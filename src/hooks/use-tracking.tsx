'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let lastUid: string | null = null;

export function useSessionTracking(uid: string | undefined, getIdToken: (() => Promise<string>) | undefined) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!uid || !getIdToken) return;

    if (lastUid === uid && heartbeatTimer) return;

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    lastUid = uid;

    const sendHeartbeat = async () => {
      try {
        const token = await getIdToken();
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

    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, 60000);

    return () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        lastUid = null;
      }
    };
  }, [uid]);
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
