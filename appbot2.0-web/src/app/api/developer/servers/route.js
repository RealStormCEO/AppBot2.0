import pool from '@/lib/db'

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT id, name, joined_at FROM guilds')
    return Response.json(rows)
  } catch (error) {
    console.error('❌ Failed to fetch servers:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
