import pool from '@/lib/db'

export async function POST(req) {
  const { user_id, username } = await req.json()
  if (!user_id || !username) return Response.json({ error: 'Missing data' }, { status: 400 })

  await pool.execute('UPDATE dev_panel_users SET username = ? WHERE user_id = ?', [username, user_id])
  return Response.json({ success: true })
}
