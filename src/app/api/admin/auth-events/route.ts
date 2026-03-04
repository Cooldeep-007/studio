import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-verify';

export async function GET(req: NextRequest) {
  try {
    const verifiedUser = await verifyAuthToken(req);
    if (!verifiedUser) {
      return NextResponse.json({ events: [], total: 0, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventType = searchParams.get('eventType');
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM auth_events';
    let countQuery = 'SELECT COUNT(*) FROM auth_events';
    const params: any[] = [];
    const countParams: any[] = [];

    if (eventType) {
      query += ' WHERE event_type = $1';
      countQuery += ' WHERE event_type = $1';
      params.push(eventType);
      countParams.push(eventType);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [result, totalResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    return NextResponse.json({
      events: result.rows,
      total: parseInt(totalResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(totalResult.rows[0].count) / limit),
    });
  } catch (error: any) {
    console.error('Auth events error:', error);
    return NextResponse.json({ events: [], total: 0, error: error.message }, { status: 500 });
  }
}
