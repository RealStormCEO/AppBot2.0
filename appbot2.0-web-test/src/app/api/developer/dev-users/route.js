import pool from '@/lib/db'

export async function GET() {
  const [rows] = await pool.execute('SELECT * FROM dev_panel_users ORDER BY added_at DESC')
  return Response.json(rows)
}
