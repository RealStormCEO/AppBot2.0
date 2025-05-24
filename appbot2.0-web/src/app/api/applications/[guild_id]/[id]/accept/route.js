// import pool from '@/lib/db' // mysql2 connection pool

// export async function POST(req, { params }) {
//   const { guild_id, id } = params

//   try {
//     // 1. Get application details (including discord user ID)
//     const [apps] = await pool.query('SELECT * FROM applications WHERE guild_id = ? AND id = ?', [guild_id, id])
//     if (apps.length === 0) return new Response('Application not found', { status: 404 })
//     const application = apps[0]

//     // 2. Get guild DM Accept settings and embed from DB
//     const [settings] = await pool.query('SELECT * FROM guild_settings WHERE guild_id = ?', [guild_id])
//     if (settings.length === 0) return new Response('Settings not found', { status: 404 })
//     const guildSettings = settings[0]

//     if (!guildSettings.dm_accept_enabled) {
//       return new Response('DM Accept is not enabled for this guild', { status: 400 })
//     }

//     // 3. Parse the embed JSON saved in DB
//     let embedData = null
//     if (guildSettings.dm_accept_embed) {
//       try {
//         embedData = JSON.parse(guildSettings.dm_accept_embed)
//       } catch {
//         embedData = null
//       }
//     }

//     // 4. Send DM embed to the user using discord.js client
//     if (embedData) {
//       try {
//         const user = await client.users.fetch(application.discord_user_id)
//         if (user) {
//           await user.send({ embeds: [embedData] })
//         }
//       } catch (err) {
//         console.error('Failed to send DM embed:', err)
//       }
//     }

//     // 5. Update application status to Accepted (2)
//     await pool.query('UPDATE applications SET application_status = 2 WHERE id = ?', [id])

//     return new Response('Application accepted and DM sent', { status: 200 })
//   } catch (err) {
//     console.error(err)
//     return new Response('Internal server error', { status: 500 })
//   }
// }
