import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-verify';

export async function GET(req: NextRequest) {
  try {
    const verifiedUser = await verifyAuthToken(req);
    if (!verifiedUser) {
      return NextResponse.json({ count: 0, users: [], error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    await pool.query('DELETE FROM active_sessions WHERE last_heartbeat < $1', [
      new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    ]);

    const result = await pool.query(
      `SELECT firebase_uid, email, display_name, current_page, last_heartbeat, started_at, metadata
       FROM active_sessions
       WHERE last_heartbeat >= $1
       ORDER BY last_heartbeat DESC`,
      [cutoff]
    );

    return NextResponse.json({
      count: result.rows.length,
      users: result.rows,
    });
  } catch (error: any) {
    console.error('Active users error:', error);
    return NextResponse.json({ count: 0, users: [], error: error.message }, { status: 500 });
  }
}
