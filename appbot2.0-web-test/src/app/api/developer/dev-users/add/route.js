import pool from '@/lib/db'

export async function POST(req) {
  const { user_id, username } = await req.json()
  if (!user_id || !username) return Response.json({ error: 'Missing fields' }, { status: 400 })

  await pool.execute(
    'INSERT INTO dev_panel_users (user_id, username, added_at) VALUES (?, ?, NOW())',
    [user_id, username]
  )

  return Response.json({ success: true })
}
