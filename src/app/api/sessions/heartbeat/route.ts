import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-verify';

export async function POST(req: NextRequest) {
  try {
    const verifiedUser = await verifyAuthToken(req);
    if (!verifiedUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPage } = body;

    await pool.query(
      `INSERT INTO active_sessions (firebase_uid, email, display_name, current_page, last_heartbeat, metadata)
       VALUES ($1, $2, $3, $4, NOW(), '{}')
       ON CONFLICT (firebase_uid)
       DO UPDATE SET
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         current_page = EXCLUDED.current_page,
         last_heartbeat = NOW()`,
      [verifiedUser.uid, verifiedUser.email, verifiedUser.name || '', currentPage || '/']
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const verifiedUser = await verifyAuthToken(req);
    if (!verifiedUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await pool.query('DELETE FROM active_sessions WHERE firebase_uid = $1', [verifiedUser.uid]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Session removal error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
