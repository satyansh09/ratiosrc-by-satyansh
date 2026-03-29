const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "nplist",
  description: "View all users in noprefix list",
  category: 'owner',
  cooldown: 3,
  async run(client, message) {
    const allowedUsers = [
      "760395853843136532",
      "1292831426839842829",
      "1191584661286174740",
      "1242320905607053422",
    ];

    if (!allowedUsers.includes(message.author.id))
      return message.reply("You do not have permission to use this command.");

    let npList = (await client.db.get("noprefix")) || [];
    if (npList.length === 0)
      return message.reply("The noprefix list is empty.");

    const pag = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setCustomId("first")
        .setLabel("≪")
        .setDisabled(true),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("previous")
        .setLabel("Previous")
        .setDisabled(true),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setCustomId("close")
        .setLabel("Delete"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("next")
        .setLabel("Next"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setCustomId("last")
        .setLabel("≫")
    );

    const pageSize = 10;
    let currentPage = 0;
    const totalPages = Math.ceil(npList.length / pageSize);

    const formatUser = (entry, index) => {
      const expires =
        entry.expiresAt && !isNaN(entry.expiresAt)
          ? new Date(entry.expiresAt).toLocaleString()
          : "Never";

      return `\`[${index + 1}]\` | <@${entry.userId}> | ID: \`${entry.userId}\` | Expires: \`${expires}\``;
    };

    const generateEmbed = () => {
      const start = currentPage * pageSize;
      const list = npList.slice(start, start + pageSize);

      const embed = new EmbedBuilder()
        .setTitle(`Noprefix List — ${npList.length}`)
        .setColor('#26272F')
        .setDescription(
          list.map((entry, i) => formatUser(entry, start + i)).join("\n")
        )
        .setFooter({
          text: `Page ${currentPage + 1} of ${totalPages} | Total: ${npList.length}`,
        });

      pag.components.forEach((b) => b.setDisabled(false));
      if (currentPage === 0) {
        pag.components[0].setDisabled(true);
        pag.components[1].setDisabled(true);
      }
      if (currentPage === totalPages - 1) {
        pag.components[3].setDisabled(true);
        pag.components[4].setDisabled(true);
      }

      return embed;
    };

    const sent = await message.reply({
      embeds: [generateEmbed()],
      components: [pag],
    });

    const collector = sent.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300000,
    });

    collector.on("collect", async (i) => {
      switch (i.customId) {
        case "first":
          currentPage = 0;
          break;
        case "previous":
          currentPage = Math.max(0, currentPage - 1);
          break;
        case "next":
          currentPage = Math.min(totalPages - 1, currentPage + 1);
          break;
        case "last":
          currentPage = totalPages - 1;
          break;
        case "close":
          await i.message.delete().catch(() => {});
          return collector.stop();
      }

      await i.update({
        embeds: [generateEmbed()],
        components: [pag],
      });
    });

    collector.on("end", async () => {
      pag.components.forEach((b) => b.setDisabled(true));
      await sent.edit({ components: [pag] }).catch(() => {});
    });
  },
};
