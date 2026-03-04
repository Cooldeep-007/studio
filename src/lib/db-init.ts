import pool from './db';

const DEFAULT_PARENT_GROUPS = [
  { group_name: 'Sundry Debtors', primary_nature: 'Assets' },
  { group_name: 'Sundry Creditors', primary_nature: 'Liabilities' },
  { group_name: 'Direct Expenses', primary_nature: 'Expense' },
  { group_name: 'Indirect Expenses', primary_nature: 'Expense' },
  { group_name: 'Direct Income', primary_nature: 'Income' },
  { group_name: 'Indirect Income', primary_nature: 'Income' },
  { group_name: 'Purchase', primary_nature: 'Expense' },
  { group_name: 'Sales', primary_nature: 'Income' },
  { group_name: 'Bank Accounts', primary_nature: 'Assets' },
  { group_name: 'Cash-in-Hand', primary_nature: 'Assets' },
  { group_name: 'Capital Account', primary_nature: 'Liabilities' },
  { group_name: 'Loans (Liability)', primary_nature: 'Liabilities' },
  { group_name: 'Current Assets', primary_nature: 'Assets' },
  { group_name: 'Current Liabilities', primary_nature: 'Liabilities' },
  { group_name: 'Fixed Assets', primary_nature: 'Assets' },
  { group_name: 'Duties & Taxes', primary_nature: 'Liabilities' },
  { group_name: 'Expenses (Payroll)', primary_nature: 'Expense' },
];

export async function initParentGroupsTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS parent_groups (
        id SERIAL PRIMARY KEY,
        group_name VARCHAR(255) NOT NULL UNIQUE,
        primary_nature VARCHAR(50) NOT NULL CHECK (primary_nature IN ('Assets', 'Liabilities', 'Income', 'Expense')),
        is_system BOOLEAN DEFAULT TRUE,
        parent_group_id INTEGER REFERENCES parent_groups(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const { rows } = await client.query('SELECT COUNT(*) FROM parent_groups');
    if (parseInt(rows[0].count) === 0) {
      const values = DEFAULT_PARENT_GROUPS.map(
        (g, i) => `($${i * 2 + 1}, $${i * 2 + 2})`
      ).join(', ');
      const params = DEFAULT_PARENT_GROUPS.flatMap(g => [g.group_name, g.primary_nature]);
      await client.query(
        `INSERT INTO parent_groups (group_name, primary_nature) VALUES ${values} ON CONFLICT (group_name) DO NOTHING`,
        params
      );
      console.log(`[DB] Seeded ${DEFAULT_PARENT_GROUPS.length} default parent groups`);
    }
  } finally {
    client.release();
  }
}
