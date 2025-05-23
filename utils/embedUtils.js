const { EmbedBuilder } = require('discord.js');

// Helper to clean and validate embed before sending
function cleanEmbed(embed) {
  if (!embed || typeof embed !== 'object') return null;

  const clean = {};

  // Title
  if (typeof embed.title === 'string') {
    const trimmedTitle = embed.title.trim();
    if (trimmedTitle.length > 0) clean.title = trimmedTitle;
  }

  // Description
  if (typeof embed.description === 'string') {
    const trimmedDesc = embed.description.trim();
    if (trimmedDesc.length > 0) clean.description = trimmedDesc;
  }

  // Color
  if (embed.color !== undefined && embed.color !== null && !isNaN(embed.color)) {
    let colorNumber = parseInt(embed.color, 10);
    if (!isNaN(colorNumber)) {
      clean.color = colorNumber;
    }
  }

  // Author
  if (
    embed.author &&
    typeof embed.author === 'object' &&
    typeof embed.author.name === 'string' &&
    embed.author.name.trim() !== ''
  ) {
    clean.author = { name: embed.author.name };
    if (embed.author.url) clean.author.url = embed.author.url;
    if (embed.author.icon_url) clean.author.icon_url = embed.author.icon_url;
  }

  // Footer
  if (
    embed.footer &&
    typeof embed.footer === 'object' &&
    typeof embed.footer.text === 'string' &&
    embed.footer.text.trim() !== ''
  ) {
    clean.footer = { text: embed.footer.text };
    if (embed.footer.icon_url) clean.footer.icon_url = embed.footer.icon_url;
  }

  // Thumbnail
  if (embed.thumbnail && typeof embed.thumbnail === 'object' && embed.thumbnail.url) {
    clean.thumbnail = { url: embed.thumbnail.url };
  }

  // Image
  if (embed.image && typeof embed.image === 'object' && embed.image.url) {
    clean.image = { url: embed.image.url };
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
  }

  // Validate presence of some content so Discord doesn't reject the embed
  const hasValidContent = ['title', 'description', 'author', 'footer', 'thumbnail', 'image', 'fields', 'color']
    .some(key => {
      if (!(key in clean)) return false;
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

  if (!hasValidContent) {
    return null;
  }

  return clean;
}

// Convert clean embed JSON into EmbedBuilder instance
function convertToEmbedBuilder(embedJson) {
  const embed = new EmbedBuilder();

  if (embedJson.title) embed.setTitle(embedJson.title);
  if (embedJson.description) embed.setDescription(embedJson.description);

  if (embedJson.color !== undefined && embedJson.color !== null) {
    embed.setColor(embedJson.color);
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

module.exports = {
  cleanEmbed,
  convertToEmbedBuilder,
  replacePlaceholders,
};
