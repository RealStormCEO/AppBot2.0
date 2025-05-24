// /api/forms/[form_id]/questions/route.js
import db from '@/lib/db'

export async function GET(req, { params }) {
  const formId = params.form_id

  try {
    const [rows] = await db.execute(
      'SELECT id, question, type, word_count_min FROM application_questions WHERE form_id = ? ORDER BY position ASC',
      [formId]
    )

    return Response.json(rows)
  } catch (err) {
    console.error('❌ Failed to fetch questions:', err)
    return Response.json({ error: 'Failed to load questions' }, { status: 500 })
  }
}