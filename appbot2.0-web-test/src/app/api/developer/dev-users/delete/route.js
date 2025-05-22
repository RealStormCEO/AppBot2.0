import pool from '@/lib/db'

export async function POST(req) {
  const { user_id } = await req.json()

  if (!user_id) {
    return Response.json({ error: 'Missing user_id' }, { status: 400 })
  }

  await pool.execute('DELETE FROM dev_panel_users WHERE user_id = ?', [user_id])
  return Response.json({ success: true })
}
