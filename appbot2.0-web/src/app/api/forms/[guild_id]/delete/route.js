import db from '@/lib/db';

export async function DELETE(request, { params }) {
  const { guild_id } = params;

  try {
    const body = await request.json();
    const { formId } = body;

    if (!formId) {
      return new Response(JSON.stringify({ error: 'Missing form ID' }), { status: 400 });
    }

    const [result] = await db.execute(
      'DELETE FROM application_forms WHERE id = ? AND guild_id = ?',
      [formId, guild_id]
    );

    return new Response(JSON.stringify({ success: true, affectedRows: result.affectedRows }));
  } catch (err) {
    console.error('❌ Error deleting form:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
