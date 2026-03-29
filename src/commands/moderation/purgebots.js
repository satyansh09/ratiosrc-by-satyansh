const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "purgebots",
  aliases: ["pb"],
  category: "mod",
  cat: "admin",

  run: async (client, message) => {
    const color = client.color || "#5865F2";
    const emoji = client.emoji || { tick: "✅", cross: "❌" };

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(`${emoji.cross} | You need **Manage Messages** permission.`),
        ],
      });

    if (
      !message.guild.members.me.permissions.has([
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ])
    )
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(
              `${emoji.cross} | I need **Manage Messages** and **Read Message History** permissions.`
            ),
        ],
      });

    const messages = await message.channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter((m) => m.author.bot);

    if (!botMessages.size)
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(`${emoji.cross} | No bot messages found to delete.`),
        ],
      });

    const deleted = await message.channel.bulkDelete(botMessages, true).catch(() => null);
    if (!deleted || !deleted.size)
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(`${emoji.cross} | Failed to delete bot messages.`),
        ],
      });

    const msg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setDescription(`${emoji.tick} | Deleted **${deleted.size}** bot messages.`),
      ],
    });

    setTimeout(() => msg.delete().catch(() => {}), 3000);
  },
};
