export async function GET(req, { params }) {
  const { guild_id } = params;

  try {
    console.log(`➡️ Fetching channels for guild: ${guild_id}`)

    const res = await fetch(`https://discord.com/api/v10/guilds/${guild_id}/channels`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
      }
    });

    console.log(`↩️ Discord response status: ${res.status}`)
    console.log('Fetching channels for guild:', guild_id)

    if (!res.ok) {
      const err = await res.text();
      console.error('❌ Discord API error:', err);
      return new Response(JSON.stringify({ error: err }), { status: res.status });
    }

    const channels = await res.json();

    const filtered = channels
      .filter(c => [0, 5].includes(c.type))
      .map(c => ({ id: c.id, name: c.name }));

    return new Response(JSON.stringify(filtered), { status: 200 });
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), { status: 500 });
  }
}
