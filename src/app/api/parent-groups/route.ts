import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { initParentGroupsTable } from '@/lib/db-init';

let initialized = false;

async function ensureTable() {
  if (!initialized) {
    await initParentGroupsTable();
    initialized = true;
  }
}

export async function GET() {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT id, group_name, primary_nature, is_system, parent_group_id, is_active, created_at
       FROM parent_groups
       WHERE is_active = TRUE
       ORDER BY is_system DESC, group_name ASC`
    );
    return NextResponse.json({ groups: rows });
  } catch (error: any) {
    console.error('Failed to fetch parent groups:', error);
    return NextResponse.json({ error: 'Failed to fetch parent groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    const { group_name, primary_nature, parent_group_id } = body;

    if (!group_name || !primary_nature) {
      return NextResponse.json({ error: 'group_name and primary_nature are required' }, { status: 400 });
    }

    const validNatures = ['Assets', 'Liabilities', 'Income', 'Expense'];
    if (!validNatures.includes(primary_nature)) {
      return NextResponse.json({ error: `primary_nature must be one of: ${validNatures.join(', ')}` }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO parent_groups (group_name, primary_nature, is_system, parent_group_id)
       VALUES ($1, $2, FALSE, $3)
       RETURNING id, group_name, primary_nature, is_system, parent_group_id, is_active, created_at`,
      [group_name.trim(), primary_nature, parent_group_id || null]
    );

    return NextResponse.json({ group: rows[0] }, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A group with this name already exists' }, { status: 409 });
    }
    console.error('Failed to create parent group:', error);
    return NextResponse.json({ error: 'Failed to create parent group' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    const { id, group_name, primary_nature } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { rows: existing } = await pool.query(
      'SELECT is_system FROM parent_groups WHERE id = $1',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (existing[0].is_system) {
      return NextResponse.json({ error: 'System groups cannot be edited' }, { status: 403 });
    }

    const validNatures = ['Assets', 'Liabilities', 'Income', 'Expense'];
    if (primary_nature && !validNatures.includes(primary_nature)) {
      return NextResponse.json({ error: `primary_nature must be one of: ${validNatures.join(', ')}` }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (group_name) {
      updates.push(`group_name = $${paramIndex++}`);
      params.push(group_name.trim());
    }
    if (primary_nature) {
      updates.push(`primary_nature = $${paramIndex++}`);
      params.push(primary_nature);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE parent_groups SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, group_name, primary_nature, is_system, parent_group_id, is_active, created_at`,
      params
    );

    return NextResponse.json({ group: rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A group with this name already exists' }, { status: 409 });
    }
    console.error('Failed to update parent group:', error);
    return NextResponse.json({ error: 'Failed to update parent group' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { rows: existing } = await pool.query(
      'SELECT is_system FROM parent_groups WHERE id = $1',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (existing[0].is_system) {
      return NextResponse.json({ error: 'System groups cannot be deleted' }, { status: 403 });
    }

    await pool.query(
      'UPDATE parent_groups SET is_active = FALSE WHERE id = $1',
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete parent group:', error);
    return NextResponse.json({ error: 'Failed to delete parent group' }, { status: 500 });
  }
}
