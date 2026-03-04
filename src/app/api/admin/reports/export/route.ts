import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-verify';

async function getReportData(reportType: string, params: URLSearchParams) {
  const startDate = params.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = params.get('endDate') || new Date().toISOString();

  switch (reportType) {
    case 'auth-events': {
      const result = await pool.query(
        `SELECT id, email, display_name, event_type, ip_address,
                TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as timestamp
         FROM auth_events
         WHERE created_at BETWEEN $1 AND $2
         ORDER BY created_at DESC`,
        [startDate, endDate]
      );
      return {
        title: 'Authentication Events Report',
        headers: ['ID', 'Email', 'Name', 'Event Type', 'IP Address', 'Timestamp'],
        keys: ['id', 'email', 'display_name', 'event_type', 'ip_address', 'timestamp'],
        rows: result.rows,
      };
    }
    case 'audit-log': {
      const result = await pool.query(
        `SELECT id, email, action, entity_type, entity_id, entity_name,
                TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as timestamp
         FROM audit_log
         WHERE created_at BETWEEN $1 AND $2
         ORDER BY created_at DESC`,
        [startDate, endDate]
      );
      return {
        title: 'Audit Log Report',
        headers: ['ID', 'Email', 'Action', 'Entity Type', 'Entity ID', 'Entity Name', 'Timestamp'],
        keys: ['id', 'email', 'action', 'entity_type', 'entity_id', 'entity_name', 'timestamp'],
        rows: result.rows,
      };
    }
    case 'active-users': {
      const result = await pool.query(
        `SELECT firebase_uid, email, display_name, current_page,
                TO_CHAR(last_heartbeat, 'YYYY-MM-DD HH24:MI:SS') as last_active,
                TO_CHAR(started_at, 'YYYY-MM-DD HH24:MI:SS') as session_started
         FROM active_sessions
         WHERE last_heartbeat >= NOW() - INTERVAL '5 minutes'
         ORDER BY last_heartbeat DESC`
      );
      return {
        title: 'Active Users Report',
        headers: ['User ID', 'Email', 'Name', 'Current Page', 'Last Active', 'Session Started'],
        keys: ['firebase_uid', 'email', 'display_name', 'current_page', 'last_active', 'session_started'],
        rows: result.rows,
      };
    }
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

function generateCSV(data: { headers: string[]; keys: string[]; rows: any[] }): string {
  const lines = [data.headers.join(',')];
  for (const row of data.rows) {
    const values = data.keys.map((key) => {
      const val = row[key] ?? '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

export async function GET(req: NextRequest) {
  try {
    const verifiedUser = await verifyAuthToken(req);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'auth-events';
    const format = searchParams.get('format') || 'csv';

    const data = await getReportData(reportType, searchParams);

    if (format === 'csv') {
      const csv = generateCSV(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Report export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
