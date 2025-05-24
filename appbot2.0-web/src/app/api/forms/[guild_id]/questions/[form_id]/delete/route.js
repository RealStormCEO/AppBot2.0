import db from '@/lib/db' // or wherever your db connection is

export async function DELETE(req) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })
  }

  try {
    await db.query('DELETE FROM application_questions WHERE id = ?', [id])
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    console.error('Delete error:', err)
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 })
  }
}
