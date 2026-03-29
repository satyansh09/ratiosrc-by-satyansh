const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "list",
  description: "List admins, bots, bans, roles, and more",
  category: "moderation",
  cooldown: 3,
  run: async (client, message, args) => {
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

    let currentPage = 0;
    const pageSize = 10;
    const listType = args[0]?.toLowerCase();

    const memberTypes = ["admin", "admins", "administration", "bot", "bots", "inrole", "inroles", "boosters", "norole", "invc", "muted"];
    if (memberTypes.includes(listType)) {
      await message.guild.members.fetch().catch(() => {});
    }

    const getListData = async () => {
      switch (listType) {
        case "admin":
        case "admins":
        case "administration": {
          const administrators = message.guild.members.cache.filter(
            (m) => m.permissions.has(PermissionFlagsBits.Administrator) && !m.user.bot
          );
          return {
            title: `Admins in ${message.guild.name}`,
            members: Array.from(administrators.values()),
            format: (member, i) =>
              `\`[${i + 1}]\` | [${member.user.tag}](https://discord.com/users/${member.user.id}) | ID: \`${member.user.id}\``,
          };
        }

        case "bots":
        case "bot": {
          const bots = message.guild.members.cache.filter((m) => m.user.bot);
          return {
            title: `Bots in ${message.guild.name}`,
            members: Array.from(bots.values()),
            format: (m, i) =>
              `\`[${i + 1}]\` | [${m.user.tag}](https://discord.com/users/${m.user.id}) | ID: \`${m.user.id}\``,
          };
        }

        case "bans":
        case "ban": {
          const bans = await message.guild.bans.fetch();
          const valid = bans.filter((b) => b.user).map((b) => b.user);
          return {
            title: `Banned Members in ${message.guild.name}`,
            members: valid,
            format: (u, i) =>
              `\`[${i + 1}]\` | [${u.tag}](https://discord.com/users/${u.id}) | ID: \`${u.id}\``,
          };
        }

        case "inrole":
        case "inroles": {
          const roleId = args[1]?.replace(/\D/g, "") || message.mentions.roles.first()?.id;
          const role = message.guild.roles.cache.get(roleId);
          if (!role) return null;
          return {
            title: `Members with ${role.name} Role in ${message.guild.name}`,
            members: Array.from(role.members.values()),
            format: (m, i) =>
              `\`[${i + 1}]\` | [${m.user.tag}](https://discord.com/users/${m.user.id}) | ID: \`${m.user.id}\``,
          };
        }

        case "boosters": {
          const boosters = message.guild.members.cache.filter(
            (m) => m.premiumSinceTimestamp
          );
          const now = Date.now();
          return {
            title: `Boosters in ${message.guild.name}`,
            members: Array.from(boosters.values()),
            format: (m, i) => {
              const days = Math.floor(
                (now - m.premiumSinceTimestamp) / (1000 * 60 * 60 * 24)
              );
              return `\`[${i + 1}]\` | [${m.user.tag}](https://discord.com/users/${m.user.id}) | ID: \`${m.user.id}\` | Boosted \`${days}\` day(s) ago`;
            },
          };
        }

        case "emoji":
        case "emojis": {
          const emojis = Array.from(message.guild.emojis.cache.values());
          return {
            title: `Emojis in ${message.guild.name}`,
            members: emojis,
            format: (emoji, i) =>
              `\`[${i + 1}]\` | ${emoji} | ID: \`${emoji.id}\` | Name: \`${emoji.name}\``,
          };
        }

        case "role":
        case "roles": {
          const roles = message.guild.roles.cache
            .filter((r) => r.name !== "@everyone")
            .sort((a, b) => b.position - a.position);
          return {
            title: `Roles in ${message.guild.name}`,
            members: Array.from(roles.values()),
            format: (r, i) =>
              `\`[${i + 1}]\` | <@&${r.id}> | ID: \`${r.id}\` | Members: \`${r.members.size}\``,
          };
        }

        case "invc": {
          const vcMembers = message.guild.members.cache.filter(
            (m) => m.voice.channel
          );
          return {
            title: `Members in Voice Channels in ${message.guild.name}`,
            members: Array.from(vcMembers.values()),
            format: (m, i) =>
              `\`[${i + 1}]\` | [${m.user.tag}](https://discord.com/users/${m.user.id}) | ID: \`${m.user.id}\``,
          };
        }

        case "norole": {
          const noRole = message.guild.members.cache.filter(
            (m) => m.roles.cache.size === 1
          );
          return {
            title: `Members without Roles in ${message.guild.name}`,
            members: Array.from(noRole.values()),
            format: (m, i) =>
              `\`[${i + 1}]\` | [${m.user.tag}](https://discord.com/users/${m.user.id}) | ID: \`${m.user.id}\``,
          };
        }

        case "muted": {
          const muted = message.guild.members.cache.filter(
            (m) => m.communicationDisabledUntilTimestamp
          );
          return {
            title: `Muted Members in ${message.guild.name}`,
            members: Array.from(muted.values()),
            format: (m, i) => {
              const mins = Math.floor(
                (m.communicationDisabledUntilTimestamp - Date.now()) / (1000 * 60)
              );
              return `\`[${i + 1}]\` | [${m.user.tag}](https://discord.com/users/${m.user.id}) | ID: \`${m.user.id}\` | Muted for \`${mins}\` min(s)`;
            },
          };
        }

        default:
          return null;
      }
    };

    const listData = await getListData();

    if (!listData) {
      const helpEmbed = new EmbedBuilder()
        .setTitle("Invalid List Type")
        .setDescription(
          [
            "✅ **Available Types:**",
            "`list admin`",
            "`list bot`",
            "`list ban`",
            "`list inrole @role`",
            "`list role`",
            "`list boosters`",
            "`list emojis`",
            "`list norole`",
            "`list invc`",
            "`list muted`",
          ].join("\n")
        )
        .setColor(client.color || "#5865F2");
      return message.reply({ embeds: [helpEmbed] });
    }

    const totalPages = Math.max(
      1,
      Math.ceil(listData.members.length / pageSize)
    );

    const generateEmbed = () => {
      const start = currentPage * pageSize;
      const end = start + pageSize;
      const members = listData.members.slice(start, end);

      const embed = new EmbedBuilder()
        .setTitle(`${listData.title}`)
        .setColor(client.color || "#5865F2")
        .setFooter({
          text: `Page ${currentPage + 1} of ${totalPages} | Total: ${listData.members.length}`,
        });

      embed.setDescription(
        members.length
          ? members
              .map((m, i) => listData.format(m, start + i))
              .join("\n")
          : "No data found."
      );

      // Button state handling
      pag.components.forEach((btn) => btn.setDisabled(false));
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

    const sentMessage = await message.reply({
      embeds: [generateEmbed()],
      components: [pag],
    });

    const filter = (i) =>
      i.user.id === message.author.id && i.message.id === sentMessage.id;

    const collector = sentMessage.createMessageComponentCollector({
      filter,
      time: 300000,
    });

    collector.on("collect", async (i) => {
      switch (i.customId) {
        case "first":
          currentPage = 0;
          break;
        case "previous":
          currentPage = Math.max(currentPage - 1, 0);
          break;
        case "next":
          currentPage = Math.min(currentPage + 1, totalPages - 1);
          break;
        case "last":
          currentPage = totalPages - 1;
          break;
        case "close":
          await i.message.delete().catch(() => {});
          return collector.stop();
      }

      await i.update({ embeds: [generateEmbed()], components: [pag] });
    });

    collector.on("end", async () => {
      pag.components.forEach((btn) => btn.setDisabled(true));
      await sentMessage.edit({ components: [pag] }).catch(() => {});
    });
  },
};
