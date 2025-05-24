import pool from '@/lib/db'

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM users ORDER BY id DESC')
    return Response.json(rows)
  } catch (err) {
    console.error('❌ Failed to fetch users:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { user_id, plan, expiration_date } = await req.json()

    await pool.query(
      'INSERT INTO users (user_id, plan, expiration_date) VALUES (?, ?, ?)',
      [user_id, plan, expiration_date]
    )

    return new Response('User added', { status: 200 })
  } catch (err) {
    console.error('❌ Failed to add user:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
