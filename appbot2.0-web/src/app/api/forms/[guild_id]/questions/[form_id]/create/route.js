import db from '@/lib/db'

export async function POST(req, { params }) {
  const { form_id } = params
  const { question, type, word_count_min } = await req.json()

  if (!question || !type) {
    return Response.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    // 1. Get the next position number
    const [[{ max }]] = await db.execute(
      'SELECT COALESCE(MAX(position), 0) + 1 AS max FROM application_questions WHERE form_id = ?',
      [form_id]
    )

    // 2. Insert the new question
    const [insert] = await db.execute(
      `INSERT INTO application_questions (form_id, question, type, word_count_min, position)
       VALUES (?, ?, ?, ?, ?)`,
      [form_id, question, type, word_count_min || null, max]
    )

    // 3. Fetch and return the inserted row
    const [rows] = await db.execute('SELECT * FROM application_questions WHERE id = ?', [insert.insertId])

    return Response.json(rows[0])
  } catch (err) {
    console.error('❌ Error inserting question:', err)
    return Response.json({ error: 'Failed to insert question' }, { status: 500 })
  }
}
