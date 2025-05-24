import pool from '@/lib/db'  // your mysql2 pool

export async function GET(req, context) {
  const { guildId } = context.params;  // get guildId here

  const [rows] = await pool.query(
    'SELECT * FROM guild_settings WHERE guild_id = ?',
    [guildId]
  );

  if (rows.length === 0) {
    return new Response(JSON.stringify({}), { status: 404 });
  }

  const row = rows[0];

  // Parse embeds if they exist
  try {
    if (row.dm_accept_embed) row.dm_accept_embed = JSON.parse(row.dm_accept_embed);
  } catch {
    row.dm_accept_embed = null;
  }

  try {
    if (row.dm_deny_embed) row.dm_deny_embed = JSON.parse(row.dm_deny_embed);
  } catch {
    row.dm_deny_embed = null;
  }

  // Parse roles if they exist (assumed stored as JSON strings)
  try {
    if (row.roles_to_add) row.roles_to_add = JSON.parse(row.roles_to_add);
  } catch {
    row.roles_to_add = [];
  }

  try {
    if (row.roles_to_remove) row.roles_to_remove = JSON.parse(row.roles_to_remove);
  } catch {
    row.roles_to_remove = [];
  }

  // Ensure auto_deny_enabled and auto_deny_threshold are present and typed correctly
  row.auto_deny_enabled = !!row.auto_deny_enabled;
  row.auto_deny_threshold = Number(row.auto_deny_threshold) || 0;

  return new Response(JSON.stringify(row), { status: 200 });
}

export async function POST(req, context) {
  const { guildId } = context.params;  // get guildId here
  const body = await req.json();

  // Validate guildId before proceeding
  if (!guildId) {
    return new Response('guildId parameter is required', { status: 400 });
  }

  const dmAcceptEmbedStr = body.dm_accept_embed ? JSON.stringify(body.dm_accept_embed) : null;
  const dmDenyEmbedStr = body.dm_deny_embed ? JSON.stringify(body.dm_deny_embed) : null;
  const rolesToAddStr = Array.isArray(body.roles_to_add) ? JSON.stringify(body.roles_to_add) : '[]';
  const rolesToRemoveStr = Array.isArray(body.roles_to_remove) ? JSON.stringify(body.roles_to_remove) : '[]';

  const [result] = await pool.query(
    `INSERT INTO guild_settings
     (guild_id, dm_accept_enabled, dm_deny_enabled, dm_accept_embed, dm_deny_embed, roles_to_add, roles_to_remove, auto_deny_enabled, auto_deny_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       dm_accept_enabled = VALUES(dm_accept_enabled),
       dm_deny_enabled = VALUES(dm_deny_enabled),
       dm_accept_embed = VALUES(dm_accept_embed),
       dm_deny_embed = VALUES(dm_deny_embed),
       roles_to_add = VALUES(roles_to_add),
       roles_to_remove = VALUES(roles_to_remove),
       auto_deny_enabled = VALUES(auto_deny_enabled),
       auto_deny_threshold = VALUES(auto_deny_threshold)`,
    [
      guildId,
      body.dm_accept_enabled ? 1 : 0,
      body.dm_deny_enabled ? 1 : 0,
      dmAcceptEmbedStr,
      dmDenyEmbedStr,
      rolesToAddStr,
      rolesToRemoveStr,
      body.auto_deny_enabled ? 1 : 0,
      Number(body.auto_deny_threshold) || 0,
    ]
  );

  const [rows] = await pool.query(
    'SELECT * FROM guild_settings WHERE guild_id = ?',
    [guildId]
  );

  return new Response(JSON.stringify(rows[0]), { status: 200 });
}
