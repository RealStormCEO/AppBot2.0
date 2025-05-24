import pool from '@/lib/db'

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT id FROM guilds')
    const ids = rows.map(row => row.id.toString())
    return new Response(JSON.stringify({ ids }), { status: 200 })
  } catch (err) {
    console.error('[API] /bot-guilds error:', err)
    return new Response(JSON.stringify({ error: 'DB error' }), { status: 500 })
  }
}
