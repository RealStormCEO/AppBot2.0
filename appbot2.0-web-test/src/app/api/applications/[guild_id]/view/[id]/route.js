import pool from '@/lib/db'

export async function GET(req, { params }) {
  const { guild_id, id } = params

  try {
    const [rows] = await pool.query(
      'SELECT * FROM applications WHERE guild_id = ? AND id = ?',
      [guild_id, id]
    )

    if (rows.length === 0) {
      return new Response('Not found', { status: 404 })
    }

    return Response.json(rows[0])
  } catch (err) {
    console.error('❌ Error fetching application:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
