import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAuthToken } from '@/lib/auth-verify';

export async function GET(req: NextRequest) {
  try {
    const verifiedUser = await verifyAuthToken(req);
    if (!verifiedUser) {
      return NextResponse.json({ logs: [], total: 0, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM audit_log';
    let countQuery = 'SELECT COUNT(*) FROM audit_log';
    const conditions: string[] = [];
    const params: any[] = [];
    const countParams: any[] = [];

    if (entityType) {
      conditions.push(`entity_type = $${conditions.length + 1}`);
      params.push(entityType);
      countParams.push(entityType);
    }
    if (action) {
      conditions.push(`action = $${conditions.length + 1}`);
      params.push(action);
      countParams.push(action);
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ');
      query += where;
      countQuery += where;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [result, totalResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    return NextResponse.json({
      logs: result.rows,
      total: parseInt(totalResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(totalResult.rows[0].count) / limit),
    });
  } catch (error: any) {
    console.error('Audit log error:', error);
    return NextResponse.json({ logs: [], total: 0, error: error.message }, { status: 500 });
  }
}
