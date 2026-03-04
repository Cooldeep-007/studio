import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-verify';

export async function GET(req: NextRequest) {
  try {
    const verifiedUser = await verifyAuthToken(req);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [activeUsers, totalLogins, totalSignups, recentChanges, loginsByDay, topUsers] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM active_sessions WHERE last_heartbeat >= NOW() - INTERVAL '5 minutes'`
      ),
      pool.query(`SELECT COUNT(*) FROM auth_events WHERE event_type = 'login'`),
      pool.query(`SELECT COUNT(*) FROM auth_events WHERE event_type = 'signup'`),
      pool.query(`SELECT COUNT(*) FROM audit_log WHERE created_at >= NOW() - INTERVAL '24 hours'`),
      pool.query(
        `SELECT DATE(created_at) as date, event_type, COUNT(*) as count
         FROM auth_events
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at), event_type
         ORDER BY date ASC`
      ),
      pool.query(
        `SELECT email, COUNT(*) as login_count
         FROM auth_events
         WHERE event_type = 'login' AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY email
         ORDER BY login_count DESC
         LIMIT 10`
      ),
    ]);

    return NextResponse.json({
      activeUsersCount: parseInt(activeUsers.rows[0].count),
      totalLogins: parseInt(totalLogins.rows[0].count),
      totalSignups: parseInt(totalSignups.rows[0].count),
      recentChanges: parseInt(recentChanges.rows[0].count),
      loginsByDay: loginsByDay.rows,
      topUsers: topUsers.rows,
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({
      activeUsersCount: 0,
      totalLogins: 0,
      totalSignups: 0,
      recentChanges: 0,
      loginsByDay: [],
      topUsers: [],
    }, { status: 500 });
  }
}
