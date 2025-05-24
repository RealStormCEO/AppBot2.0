import pool from '@/lib/db'

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const idsParam = url.searchParams.get('ids')

    if (!idsParam) {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    // Parse and filter IDs to only valid numbers
    const ids = idsParam
      .split(',')
      .map(id => Number(id))
      .filter(id => !isNaN(id))

    if (ids.length === 0) {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    // Prepare placeholders for SQL IN clause
    const placeholders = ids.map(() => '?').join(',')

    const [rows] = await pool.query(
      `SELECT id, title FROM application_forms WHERE id IN (${placeholders})`,
      ids
    )

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('❌ Error fetching form titles:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
