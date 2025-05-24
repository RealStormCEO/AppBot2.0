const db = require('@/lib/db')

export async function POST(req, { params }) {
  const { guild_id } = params
  const body = await req.json()
  const { title, log_channel_id } = body

  if (!guild_id || !title || !log_channel_id) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), {
      status: 400,
    })
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO application_forms (guild_id, title, log_channel_id) VALUES (?, ?, ?)',
      [guild_id, title, log_channel_id]
    )

    return new Response(JSON.stringify({
      id: result.insertId,
      guild_id,
      title,
      log_channel_id
    }), { status: 200 })

  } catch (err) {
    console.error('❌ Failed to create form:', err)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })
  }
}
