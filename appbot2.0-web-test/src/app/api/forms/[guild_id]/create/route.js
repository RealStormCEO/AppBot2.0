// src/app/api/forms/[guild_id]/create/route.js

const db = require('@/lib/db') // adjust if your DB util is in a different path

export async function POST(req, { params }) {
  const { guild_id } = params
  const body = await req.json()
  const { title } = body

  if (!guild_id || !title) {
    return new Response(JSON.stringify({ error: 'Missing guild_id or title' }), {
      status: 400,
    })
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO application_forms (guild_id, title) VALUES (?, ?)',
      [guild_id, title]
    )

    return new Response(JSON.stringify({ id: result.insertId, guild_id, title }), {
      status: 200,
    })
  } catch (err) {
    console.error('❌ Failed to create form:', err)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })
  }
}
