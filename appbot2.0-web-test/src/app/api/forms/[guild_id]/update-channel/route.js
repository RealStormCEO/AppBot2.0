import pool from '@/lib/db'

export async function POST(req, { params }) {
  const { guild_id } = params
  const { formId, log_channel_id } = await req.json()

  if (!formId || !log_channel_id) {
    return new Response(JSON.stringify({ error: 'Missing data' }), { status: 400 })
  }

  try {
    await pool.execute(
      'UPDATE application_forms SET log_channel_id = ? WHERE id = ? AND guild_id = ?',
      [log_channel_id, formId, guild_id]
    )
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    console.error('❌ Update channel failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to update channel' }), { status: 500 })
  }
}
