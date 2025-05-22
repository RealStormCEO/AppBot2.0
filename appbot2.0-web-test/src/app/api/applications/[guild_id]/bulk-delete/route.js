import pool from '@/lib/db'

export async function POST(req, { params }) {
  const { ids } = await req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return new Response('No IDs provided', { status: 400 })
  }

  try {
    await pool.query(`DELETE FROM applications WHERE id IN (${ids.map(() => '?').join(',')})`, ids)
    return new Response('Deleted', { status: 200 })
  } catch (err) {
    console.error('❌ Bulk delete error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
