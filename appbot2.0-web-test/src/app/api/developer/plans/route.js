import pool from '@/lib/db'

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT name, max_forms, max_questions FROM plans ORDER BY id ASC')
    return new Response(JSON.stringify(rows), { status: 200 })
  } catch (error) {
    console.error(error)
    return new Response('Failed to fetch plans', { status: 500 })
  }
}
