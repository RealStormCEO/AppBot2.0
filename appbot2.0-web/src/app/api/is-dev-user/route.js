import pool from '@/lib/db'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Missing userId' }), {
      status: 400,
    })
  }

  try {
    const [rows] = await pool.query('SELECT * FROM dev_panel_users WHERE user_id = ?', [userId])
    const isDev = rows.length > 0

    return new Response(JSON.stringify({ isDev }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('MySQL Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
