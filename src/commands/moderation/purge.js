const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "purge",
  aliases: ["clear"],
  description: "Bulk delete messages in a channel",
  category: "moderation",
  cooldown: 3,
  run: async (client, message, args) => {
    const color = client.color || "#5865F2";
    const emoji = client.emoji || { cross: "❌", tick: "✅" };

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

    const type = args[0]?.toLowerCase();
    const input = args.slice(1).join(" ");
    const amountArg = parseInt(args.find((a) => /^\d+$/.test(a))) || null;

    if (!type)
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(
              [
                "### 🧹 **Purge Usage**",
                "`purge <amount>` — Delete last N messages instantly",
                "`purge user @user [amount]` — Delete a user's messages (ask confirm if no amount)",
                "`purge attachments [amount]` — Delete messages with files (ask confirm if no amount)",
                "`purge contains <word>` — Delete all messages containing a word (max 100)",
              ].join("\n")
            ),
        ],
      });

    const fetchLimit = 100;
    const messages = await message.channel.messages.fetch({ limit: fetchLimit });
    let filtered = [];

    if (/^\d+$/.test(type)) {
      const amount = Math.min(parseInt(type) + 1, 100);
      const deleted = await message.channel.bulkDelete(amount, true).catch(() => null);
      const actualDeleted = deleted ? deleted.size - 1 : 0;
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(
              deleted
                ? `${emoji.tick} | Deleted **${actualDeleted}** messages.`
                : `${emoji.cross} | Failed to delete messages.`
            ),
        ],
      }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
    }

    switch (type) {
      case "user": {
        const user =
          message.mentions.users.first() ||
          (input ? await client.users.fetch(input).catch(() => null) : null);
        if (!user)
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(color)
                .setDescription(`${emoji.cross} | Mention or specify a valid user.`),
            ],
          });

        const amount = Math.min(amountArg || 10, 100);
        filtered = messages.filter((m) => m.author.id === user.id).first(amount);

        if (!filtered.length)
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(color)
                .setDescription(`${emoji.cross} | No recent messages found from that user.`),
            ],
          });

        if (!amountArg) {
          const confirmEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle("⚠️ Confirm Purge")
            .setDescription(
              `Delete last **${filtered.length}** messages from **${user.tag}**?`
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("confirm_purge")
              .setLabel("✅ Confirm")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId("cancel_purge")
              .setLabel("❌ Cancel")
              .setStyle(ButtonStyle.Danger)
          );

          const msg = await message.reply({ embeds: [confirmEmbed], components: [row] });
          const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 15000,
          });

          collector.on("collect", async (i) => {
            await i.deferUpdate();
            if (i.customId === "cancel_purge") {
              collector.stop("cancelled");
              return msg.edit({
                embeds: [
                  new EmbedBuilder()
                    .setColor(color)
                    .setDescription(`${emoji.cross} | Cancelled.`),
                ],
                components: [],
              });
            }

            if (i.customId === "confirm_purge") {
              const deleted = await message.channel.bulkDelete(filtered, true).catch(() => null);
              collector.stop("confirmed");
              return msg.edit({
                embeds: [
                  new EmbedBuilder()
                    .setColor(color)
                    .setDescription(
                      deleted
                        ? `${emoji.tick} | Deleted **${deleted.size}** messages from ${user.tag}.`
                        : `${emoji.cross} | Failed to delete messages.`
                    ),
                ],
                components: [],
              });
            }
          });

          collector.on("end", async (_, reason) => {
            if (reason !== "confirmed" && reason !== "cancelled")
              await msg.edit({
                embeds: [
                  new EmbedBuilder()
                    .setColor(color)
                    .setDescription(`${emoji.cross} | Purge timed out.`),
                ],
                components: [],
              });
          });
          return;
        }

        const deleted = await message.channel.bulkDelete(filtered, true).catch(() => null);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(color)
              .setDescription(
                deleted
                  ? `${emoji.tick} | Deleted **${deleted.size}** messages from ${user.tag}.`
                  : `${emoji.cross} | Failed to delete messages.`
              ),
          ],
        });
      }

      case "attachments": {
        const amount = Math.min(amountArg || 10, 100);
        filtered = messages.filter((m) => m.attachments.size > 0).first(amount);

        if (!filtered.length)
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(color)
                .setDescription(`${emoji.cross} | No recent attachment messages found.`),
            ],
          });

        if (!amountArg) {
          const confirmEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle("⚠️ Confirm Purge")
            .setDescription(`Delete last **${filtered.length}** messages with attachments?`);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("confirm_purge")
              .setLabel("✅ Confirm")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId("cancel_purge")
              .setLabel("❌ Cancel")
              .setStyle(ButtonStyle.Danger)
          );

          const msg = await message.reply({ embeds: [confirmEmbed], components: [row] });
          const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 15000,
          });

          collector.on("collect", async (i) => {
            await i.deferUpdate();
            if (i.customId === "cancel_purge") {
              collector.stop("cancelled");
              return msg.edit({
                embeds: [
                  new EmbedBuilder()
                    .setColor(color)
                    .setDescription(`${emoji.cross} | Cancelled.`),
                ],
                components: [],
              });
            }

            if (i.customId === "confirm_purge") {
              const deleted = await message.channel.bulkDelete(filtered, true).catch(() => null);
              collector.stop("confirmed");
              return msg.edit({
                embeds: [
                  new EmbedBuilder()
                    .setColor(color)
                    .setDescription(
                      deleted
                        ? `${emoji.tick} | Deleted **${deleted.size}** messages with attachments.`
                        : `${emoji.cross} | Failed to delete messages.`
                    ),
                ],
                components: [],
              });
            }
          });

          collector.on("end", async (_, reason) => {
            if (reason !== "confirmed" && reason !== "cancelled")
              await msg.edit({
                embeds: [
                  new EmbedBuilder()
                    .setColor(color)
                    .setDescription(`${emoji.cross} | Purge timed out.`),
                ],
                components: [],
              });
          });
          return;
        }

        const deleted = await message.channel.bulkDelete(filtered, true).catch(() => null);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(color)
              .setDescription(
                deleted
                  ? `${emoji.tick} | Deleted **${deleted.size}** messages with attachments.`
                  : `${emoji.cross} | Failed to delete messages.`
              ),
          ],
        });
      }

      case "contains": {
        const keyword = input || args[1];
        if (!keyword)
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(color)
                .setDescription(`${emoji.cross} | Provide a keyword to search.`),
            ],
          });

        filtered = messages.filter((m) =>
          m.content.toLowerCase().includes(keyword.toLowerCase())
        );

        if (!filtered.size)
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(color)
                .setDescription(`${emoji.cross} | No messages found containing "${keyword}".`),
            ],
          });

        const deleted = await message.channel.bulkDelete(filtered, true).catch(() => null);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(color)
              .setDescription(
                deleted
                  ? `${emoji.tick} | Deleted **${deleted.size}** messages containing "${keyword}".`
                  : `${emoji.cross} | Failed to delete messages.`
              ),
          ],
        });
      }

      default:
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(color)
              .setDescription(`${emoji.cross} | Invalid purge type.`),
          ],
        });
    }
  },
};
