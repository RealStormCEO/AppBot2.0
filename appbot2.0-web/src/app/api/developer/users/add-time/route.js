import pool from '@/lib/db'

export async function POST(req) {
  try {
    const { days } = await req.json()

    await pool.query(`
      UPDATE users
      SET expiration_date = DATE_ADD(expiration_date, INTERVAL ? DAY)
    `, [days])

    return new Response('Time added', { status: 200 })
  } catch (err) {
    console.error('❌ Failed to add time:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
