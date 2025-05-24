import pool from '@/lib/db'

export async function GET(req, { params }) {
  const { guildId } = params
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // "accept" or "deny"

  if (!['accept', 'deny'].includes(type)) {
    return new Response('Invalid embed type', { status: 400 })
  }

  try {
    const [rows] = await pool.query(
      'SELECT dm_accept_embed, dm_deny_embed FROM guild_settings WHERE guild_id = ?',
      [guildId]
    )

    if (rows.length === 0) {
      return new Response(JSON.stringify({ embed: null }), { status: 200 })
    }

    const embedJson = type === 'accept' ? rows[0].dm_accept_embed : rows[0].dm_deny_embed
    let embed = null

    if (embedJson) {
      try {
        embed = JSON.parse(embedJson)
      } catch (err) {
        console.error('Failed to parse embed JSON:', err)
        embed = null
      }
    }

    return new Response(JSON.stringify({ embed }), { status: 200 })
  } catch (error) {
    console.error('Database query error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
