import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-verify';

export async function POST(req: NextRequest) {
  try {
    const verifiedUser = await verifyAuthToken(req);

    const body = await req.json();
    const { action, entityType, entityId, entityName, changes, metadata } = body;

    const uid = verifiedUser?.uid || body.firebaseUid || null;
    const email = verifiedUser?.email || body.email || null;

    await pool.query(
      `INSERT INTO audit_log (firebase_uid, email, action, entity_type, entity_id, entity_name, changes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uid, email, action, entityType, entityId, entityName, JSON.stringify(changes || {}), JSON.stringify(metadata || {})]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Audit log error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
