import pool from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { id } = params
    if (!id) {
      return new Response('Feedback ID is required', { status: 400 })
    }

    const [rows] = await pool.query(
      `SELECT f.id, f.username, f.guild_id, f.feedback, f.submitted_at, g.name AS guild_name
       FROM feedback f
       LEFT JOIN guilds g ON f.guild_id = g.id
       WHERE f.id = ?`,
      [id]
    )

    if (rows.length === 0) {
      return new Response('Feedback not found', { status: 404 })
    }

    return new Response(JSON.stringify(rows[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Failed to fetch feedback:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    if (!id) {
      return new Response('Feedback ID is required', { status: 400 })
    }
    const [result] = await pool.query('DELETE FROM feedback WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return new Response('Feedback not found', { status: 404 })
    }
    return new Response('Deleted successfully', { status: 200 })
  } catch (error) {
    console.error('Failed to delete feedback:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
