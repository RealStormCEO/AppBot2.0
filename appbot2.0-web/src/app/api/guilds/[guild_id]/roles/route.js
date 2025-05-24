export async function GET(req, { params }) {
  const { guild_id } = params;

  try {
    console.log(`➡️ Fetching roles for guild: ${guild_id}`)

    const res = await fetch(`https://discord.com/api/v10/guilds/${guild_id}/roles`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
      }
    });

    console.log(`↩️ Discord response status: ${res.status}`);

    if (!res.ok) {
      const err = await res.text();
      console.error('❌ Discord API error:', err);
      return new Response(JSON.stringify({ error: err }), { status: res.status });
    }

    const roles = await res.json();

    // Filter or map roles as needed; here we map to id and name only
    const filtered = roles.map(role => ({ id: role.id, name: role.name }));

    return new Response(JSON.stringify(filtered), { status: 200 });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), { status: 500 });
  }
}