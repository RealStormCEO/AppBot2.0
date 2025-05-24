import db from '@/lib/db'

export async function POST(req) {
  const { id, question, type, word_count_min } = await req.json()

  try {
    await db.execute(
      `UPDATE application_questions SET question = ?, type = ?, word_count_min = ? WHERE id = ?`,
      [question, type, word_count_min || null, id]
    )

    const [rows] = await db.execute(`SELECT * FROM application_questions WHERE id = ?`, [id])
    return Response.json(rows[0])
  } catch (err) {
    console.error('Update error:', err)
    return Response.json({ error: 'Failed to update question' }, { status: 500 })
  }
}
