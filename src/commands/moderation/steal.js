const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = {
  name: 'steal',
  description: 'Add emojis or stickers to this server',
  aliases: ['eadd', 'grab'],
  category: 'util',
  cooldown: 6,
  run: async (client, message, args) => {
    const prefix = message.guild?.prefix || '&';

    if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('❌ You need the `Manage Emojis and Stickers` permission.')
            .setColor('#FF4444'),
        ],
      });
    }

    let inputs = [];

    if (message.reference) {
      try {
        const refMsg = await message.channel.messages.fetch(message.reference.messageId);
        const attachments = [...refMsg.attachments.values()].map(a => a.url);
        const stickers = [...refMsg.stickers.values()].map(s => s.url);
        const emojis = (refMsg.content.match(/<a?:\w+:\d+>/g) || []).map(parseEmoteToUrl).filter(Boolean);
        inputs = [...attachments, ...stickers, ...emojis];
      } catch (e) {
        console.error(e);
      }
    }

    if (args.length) {
      for (const arg of args) {
        if (arg.startsWith('<')) {
          const url = parseEmoteToUrl(arg);
          if (url) inputs.push(url);
        } else if (arg.startsWith('http')) {
          inputs.push(arg);
        }
      }
    }

    if (!inputs.length) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ No valid emoji, sticker, or image found!\n\n**Usage:** \`${prefix}steal <emoji|url>\`\n**Or:** Reply to a message containing emojis/stickers`)
            .setColor('#FF4444')
            .setFooter({ text: 'Tip: You can also attach images directly!' }),
        ],
      });
    }

    await createPagedSelector(message, inputs);
  },
};

function parseEmoteToUrl(emote) {
  try {
    const match = emote.match(/<?(a)?:\w+:(\d+)>?/);
    if (!match) return null;
    const animated = Boolean(match[1]);
    const id = match[2];
    return `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
  } catch {
    return null;
  }
}

function generateRandomName(prefix = 'item') {
  const randomNum = Math.floor(Math.random() * 999999) + 100000;
  return `${prefix}_${randomNum}`;
}

async function addEmoji(message, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image (${response.status})`);
    const buffer = Buffer.from(await response.arrayBuffer());

    const name = generateRandomName('emoji');
    const emoji = await message.guild.emojis.create({
      attachment: buffer,
      name: name,
    });

    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(`✅ Successfully added emoji ${emoji} (\`${name}\`)`)
          .setThumbnail(url)
          .setColor('#00FF88')
          .setFooter({ text: `Total emojis: ${message.guild.emojis.cache.size}` }),
      ],
    });
  } catch (e) {
    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(`❌ Failed to add emoji: ${e.message}`)
          .setColor('#FF4444'),
      ],
    });
  }
}

async function addSticker(message, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch sticker (${response.status})`);
    const buffer = Buffer.from(await response.arrayBuffer());

    const name = generateRandomName('sticker');
    const file = { attachment: buffer, name: 'sticker.png' };

    const sticker = await message.guild.stickers.create({
      file,
      name: name,
      tags: '⭐',
    });

    const totalStickers = message.guild.stickers.cache.size;

    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(`✅ Successfully added sticker **${name}**`)
          .setThumbnail(url)
          .setColor('#00FF88')
          .setFooter({ text: `Total stickers: ${totalStickers}` }),
      ],
    });
  } catch (e) {
    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(`❌ Failed to add sticker: ${e.message}`)
          .setColor('#FF4444'),
      ],
    });
  }
}

async function createPagedSelector(message, urls) {
  let index = 0;

  const embed = new EmbedBuilder()
    .setTitle('Emoji/Sticker Stealer')
    .setDescription(`Previewing **${index + 1}** of **${urls.length}**\nChoose what to steal:`)
    .setImage(urls[index])
    .setColor('#5865F2')
    .setFooter({ text: 'This menu will expire in 2 minutes' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(urls.length === 1),
    new ButtonBuilder()
      .setCustomId('steal_emoji')
      .setLabel('Steal as Emoji')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('steal_sticker')
      .setLabel('Steal as Sticker')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(urls.length === 1),
  );

  const msg = await message.reply({ embeds: [embed], components: [row] });
  const filter = i => i.user.id === message.author.id;
  const collector = msg.createMessageComponentCollector({ filter, time: 120000 });

  collector.on('collect', async interaction => {
    await interaction.deferUpdate();

    if (interaction.customId === 'prev') {
      index = (index - 1 + urls.length) % urls.length;
    } else if (interaction.customId === 'next') {
      index = (index + 1) % urls.length;
    } else if (interaction.customId === 'steal_emoji') {
      await addEmoji(message, urls[index]);
    } else if (interaction.customId === 'steal_sticker') {
      await addSticker(message, urls[index]);
    }

    embed
      .setDescription(`Previewing **${index + 1}** of **${urls.length}**\nChoose what to steal:`)
      .setImage(urls[index]);

    await msg.edit({ embeds: [embed], components: [row] });
  });

  collector.on('end', async () => {
    row.components.forEach(b => b.setDisabled(true));
    embed.setFooter({ text: 'This menu has expired' });
    await msg.edit({ embeds: [embed], components: [row] }).catch(() => {});
  });
}