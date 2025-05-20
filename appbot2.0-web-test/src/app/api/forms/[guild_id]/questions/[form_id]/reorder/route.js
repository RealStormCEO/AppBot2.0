import db from '@/lib/db'

export async function POST(req, { params }) {
  const { form_id } = params
  const { order } = await req.json()

  if (!Array.isArray(order)) {
    return Response.json({ error: 'Invalid order data' }, { status: 400 })
  }

  const queries = order.map((id, i) =>
    db.execute('UPDATE application_questions SET position = ? WHERE id = ? AND form_id = ?', [
      i + 1,
      id,
      form_id
    ])
  )

  try {
    await Promise.all(queries)
    return Response.json({ success: true })
  } catch (err) {
    console.error('Failed to save order:', err)
    return Response.json({ error: 'Database error' }, { status: 500 })
  }
}
