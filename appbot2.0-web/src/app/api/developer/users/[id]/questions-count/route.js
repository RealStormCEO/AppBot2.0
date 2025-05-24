import pool from '@/lib/db'

export async function GET(req, { params }) {
  const { id } = params

  try {
    const [rows] = await pool.query(`
      SELECT COUNT(q.id) AS totalQuestions
      FROM questions q
      JOIN forms f ON q.form_id = f.id
      WHERE f.user_id = ?`, [id])

    return new Response(JSON.stringify({ totalQuestions: rows[0]?.totalQuestions || 0 }), { status: 200 })
  } catch (err) {
    console.error('Failed to fetch question count:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
