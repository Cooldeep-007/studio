import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-verify';

export async function POST(req: NextRequest) {
  try {
    const verifiedUser = await verifyAuthToken(req);

    const body = await req.json();
    const { eventType, metadata } = body;

    const userAgent = req.headers.get('user-agent') || '';
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    const uid = verifiedUser?.uid || body.firebaseUid || null;
    const email = verifiedUser?.email || body.email || null;
    const displayName = verifiedUser?.name || body.displayName || null;

    await pool.query(
      `INSERT INTO auth_events (firebase_uid, email, display_name, event_type, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uid, email, displayName, eventType, ip, userAgent, JSON.stringify(metadata || {})]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Auth event logging error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
