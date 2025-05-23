const pool = require('../database/db'); // adjust path as needed
const { EmbedBuilder } = require('discord.js');

// Helper to clean and validate embed before sending
function cleanEmbed(embed) {
  if (!embed || typeof embed !== 'object') {
    return null;
  }

  const clean = {};

  // Title
  if (typeof embed.title === 'string') {
    const trimmedTitle = embed.title.trim();
    if (trimmedTitle.length > 0) {
      clean.title = trimmedTitle;
    }
  } else {
    console.log('No valid title found');
  }

  // Description
  if (typeof embed.description === 'string') {
    const trimmedDesc = embed.description.trim();
    if (trimmedDesc.length > 0) {
      clean.description = trimmedDesc;
    }
  } else {
    console.log('No valid description found');
  }

  // Color
  if (embed.color !== undefined && embed.color !== null && !isNaN(embed.color)) {
    let colorNumber = parseInt(embed.color, 10);
    if (isNaN(colorNumber)) {
      console.warn('Color conversion failed:', embed.color);
    } else {
      clean.color = colorNumber;
    }
  } else {
    console.log('No valid color found');
  }

  // Author
  if (
    embed.author &&
    typeof embed.author === 'object' &&
    typeof embed.author.name === 'string' &&
    embed.author.name.trim() !== ''
  ) {
    clean.author = {
      name: embed.author.name,
    };
    if (embed.author.url) clean.author.url = embed.author.url;
    if (embed.author.icon_url) clean.author.icon_url = embed.author.icon_url;
  } else {
    console.log('No valid author found');
  }

  // Footer
  if (
    embed.footer &&
    typeof embed.footer === 'object' &&
    typeof embed.footer.text === 'string' &&
    embed.footer.text.trim() !== ''
  ) {
    clean.footer = {
      text: embed.footer.text,
    };
    if (embed.footer.icon_url) clean.footer.icon_url = embed.footer.icon_url;
  } else {
    console.log('No valid footer found');
  }

  // Thumbnail
  if (embed.thumbnail && typeof embed.thumbnail === 'object' && embed.thumbnail.url) {
    clean.thumbnail = { url: embed.thumbnail.url };
  } else {
    console.log('No valid thumbnail found');
  }

  // Image
  if (embed.image && typeof embed.image === 'object' && embed.image.url) {
    clean.image = { url: embed.image.url };
  } else {
    console.log('No valid image found');
  }

  // Fields
  if (Array.isArray(embed.fields) && embed.fields.length > 0) {
    clean.fields = embed.fields
      .filter(f => f.name && f.value)
      .map(f => ({
        name: f.name,
        value: f.value,
        inline: !!f.inline,
      }));
  } else {
    console.log('No valid fields found');
  }

  // Validate presence of content
  const hasValidContent = ['title', 'description', 'author', 'footer', 'thumbnail', 'image', 'fields', 'color']
    .some(key => {
      if (!(key in clean)) {
        return false;
      }
      const val = clean[key];
      if (key === 'fields') return Array.isArray(val) && val.length > 0;
      if (typeof val === 'string') return val.trim().length > 0;
      if (typeof val === 'object' && val !== null) {
        if (['author', 'thumbnail', 'image'].includes(key)) return true;
        return Object.keys(val).length > 0;
      }
      if (typeof val === 'number') return true;
      return !!val;
    });

  console.log('Has valid content:', hasValidContent);

  if (!hasValidContent) {
    console.warn('Embed invalid or empty after cleaning:', clean);
    return null;
  }

  console.log('Returning cleaned embed:', clean);
  return clean;
}

const testEmbed = {
  title: "Testing AppBot2.0 Support",
  description: "Testing <@1372677016314183750>",
  color: 39423,
  fields: [{ name: "Testing one field", value: "Testing", inline: false }],
  footer: { text: "Developer" }
};

console.log(cleanEmbed(testEmbed));

// Convert clean embed JSON into EmbedBuilder instance
function convertToEmbedBuilder(embedJson) {
  const embed = new EmbedBuilder();

  if (embedJson.title) embed.setTitle(embedJson.title);
  if (embedJson.description) embed.setDescription(embedJson.description);

  // Color must be a number. If you have a decimal color, convert it to hex int like this:
  if (embedJson.color !== undefined && embedJson.color !== null) {
    let colorNumber = embedJson.color;
    // If decimal, convert to hex (this is optional but recommended)
    if (typeof colorNumber === 'number' && colorNumber < 0xFFFFFF) {
      colorNumber = Number(`0x${colorNumber.toString(16).padStart(6, '0')}`);
    }
    embed.setColor(colorNumber);
  }

  if (embedJson.url) embed.setURL(embedJson.url);

  if (embedJson.author) {
    embed.setAuthor({
      name: embedJson.author.name,
      iconURL: embedJson.author.icon_url || undefined,
      url: embedJson.author.url || undefined,
    });
  }

  if (embedJson.thumbnail) {
    embed.setThumbnail(embedJson.thumbnail.url);
  }

  if (Array.isArray(embedJson.fields)) {
    embedJson.fields.forEach(field => {
      // Validate field name and value before adding
      if (field.name && field.value) {
        embed.addFields({
          name: field.name,
          value: field.value,
          inline: field.inline || false,
        });
      }
    });
  }

  if (embedJson.image) {
    embed.setImage(embedJson.image.url);
  }

  if (embedJson.timestamp) {
    embed.setTimestamp(new Date(embedJson.timestamp));
  }

  if (embedJson.footer) {
    embed.setFooter({
      text: embedJson.footer.text,
      iconURL: embedJson.footer.icon_url || undefined,
    });
  }

  return embed;
}

// Replace placeholders in string/object recursively
function replacePlaceholders(obj, replacements) {
  if (typeof obj === 'string') {
    let replaced = obj;
    for (const [key, value] of Object.entries(replacements)) {
      replaced = replaced.split(key).join(value);
    }
    return replaced;
  } else if (Array.isArray(obj)) {
    return obj.map(item => replacePlaceholders(item, replacements));
  } else if (typeof obj === 'object' && obj !== null) {
    const replacedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      replacedObj[key] = replacePlaceholders(value, replacements);
    }
    return replacedObj;
  } else {
    return obj;
  }
}

async function pollApplicationsAndSendDMs(client) {
  setInterval(async () => {
    try {
      // Fetch applications with status 2 (accepted) or 3 (denied) and dm_sent = 0
      const [rows] = await pool.query(`
        SELECT a.*, gs.dm_accept_enabled, gs.dm_deny_enabled, gs.dm_accept_embed, gs.dm_deny_embed
        FROM applications a
        JOIN guild_settings gs ON a.guild_id = gs.guild_id
        WHERE a.application_status IN (2, 3) AND a.dm_sent = 0
      `);

      for (const app of rows) {

        // Validate Discord user ID
        if (
          !app.user_id ||
          app.user_id === 'null' ||
          app.user_id === null ||
          !/^\d+$/.test(app.user_id)
        ) {
          console.error(`Invalid Discord user ID for application ID ${app.id}:`, app.user_id);
          await pool.query('UPDATE applications SET dm_sent = 1 WHERE id = ?', [app.id]);
          continue;
        }

        // Fetch guild name dynamically from guilds table using guild_id
        let guildName = 'Unknown Server';
        try {
          const [guildRows] = await pool.query('SELECT name FROM guilds WHERE id = ?', [app.guild_id]);
          if (guildRows.length > 0) {
            guildName = guildRows[0].name || guildName;
          }
        } catch (guildErr) {
          console.error(`Failed to fetch guild name for guild_id ${app.guild_id}:`, guildErr);
        }

        try {
          const user = await client.users.fetch(app.user_id);
          if (!user) {
            console.error(`User not found for Discord ID ${app.user_id} (application ID ${app.id})`);
            await pool.query('UPDATE applications SET dm_sent = 1 WHERE id = ?', [app.id]);
            continue;
          }

          let embedDataJSON = null;
          let sendDM = false;

          if (app.application_status === 2 && app.dm_accept_enabled) {
            embedDataJSON = app.dm_accept_embed;
            sendDM = true;
          } else if (app.application_status === 3 && app.dm_deny_enabled) {
            embedDataJSON = app.dm_deny_embed;
            sendDM = true;
          }

          if (sendDM) {
            if (!embedDataJSON) {
              await pool.query('UPDATE applications SET dm_sent = 1 WHERE id = ?', [app.id]);
              continue;
            }

            let embedJson;
            try {
              embedJson = JSON.parse(embedDataJSON);
            } catch (parseErr) {
              console.error(`Failed to parse embed JSON for application ID ${app.id}:`, parseErr);
              await pool.query('UPDATE applications SET dm_sent = 1 WHERE id = ?', [app.id]);
              continue;
            }

            // Prepare replacements including guildName fetched just now
            const replacements = {
              '{server.name}': guildName,
              '{server.id}': app.guild_id,
              '{user.name}': user.username,
              '{user.id}': user.id,
              '{user.tag}': `${user.username}#${user.discriminator}`,
            };

            // Replace placeholders
            const replacedEmbedJson = replacePlaceholders(embedJson, replacements);

            let embedObj;
            try {
                embedObj = typeof replacedEmbedJson === 'string' ? JSON.parse(replacedEmbedJson) : replacedEmbedJson;
            } catch (e) {
                console.error('Failed to parse embed JSON string before cleaning:', e);
                await pool.query('UPDATE applications SET dm_sent = 1 WHERE id = ?', [app.id]);
                continue;
            }

            const cleanedEmbedJson = cleanEmbed(embedObj);

            if (!cleanedEmbedJson) {
              console.error(`Embed invalid or empty after cleaning for application ID ${app.id}`);
              await pool.query('UPDATE applications SET dm_sent = 1 WHERE id = ?', [app.id]);
              continue;
            }

            // Convert cleaned embed JSON to EmbedBuilder instance
            const embed = convertToEmbedBuilder(cleanedEmbedJson);


            await user.send({ embeds: [embed] });
            await pool.query('UPDATE applications SET dm_sent = 1 WHERE id = ?', [app.id]);
          } else {
            return;
          }
        } catch (dmErr) {
          console.error(`Failed to send DM for application ID ${app.id}:`, dmErr);
          // Optionally don't mark as sent to retry later
        }
      }
    } catch (err) {
      console.error('Error polling applications:', err);
    }
  }, 15000); // runs every 15 seconds
}

module.exports = {
  pollApplicationsAndSendDMs
};
