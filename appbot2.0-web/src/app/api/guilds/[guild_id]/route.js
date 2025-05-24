import pool from '@/lib/db';

export async function GET(request, { params }) {
  const { guild_id } = params;

  if (!guild_id) {
    return new Response(JSON.stringify({ error: 'Missing guild_id' }), { status: 400 });
  }

  try {
    const [rows] = await pool.query(
      `SELECT dm_accept_embed, dm_deny_embed, roles_to_add, roles_to_remove FROM guild_settings WHERE guild_id = ? LIMIT 1`,
      [guild_id]
    );

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Guild not found' }), { status: 404 });
    }

    return new Response(
      JSON.stringify({
        dm_accept_embed: rows[0].dm_accept_embed ? JSON.parse(rows[0].dm_accept_embed) : null,
        dm_deny_embed: rows[0].dm_deny_embed ? JSON.parse(rows[0].dm_deny_embed) : null,
        roles_to_add: rows[0].roles_to_add ? JSON.parse(rows[0].roles_to_add) : [],
        roles_to_remove: rows[0].roles_to_remove ? JSON.parse(rows[0].roles_to_remove) : [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('DB error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
