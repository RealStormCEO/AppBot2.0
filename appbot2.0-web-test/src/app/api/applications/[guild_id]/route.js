import pool from '@/lib/db'

export async function GET(req, { params }) {
  const { guild_id } = params

  try {
    const [rows] = await pool.query(
      'SELECT * FROM applications WHERE guild_id = ? ORDER BY submitted_at DESC',
      [guild_id]
    )

    return Response.json(rows)
  } catch (err) {
    console.error('❌ Error fetching applications:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
