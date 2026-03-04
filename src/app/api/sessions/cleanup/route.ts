import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await pool.query(
      'DELETE FROM active_sessions WHERE last_heartbeat < NOW() - INTERVAL \'15 minutes\''
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
