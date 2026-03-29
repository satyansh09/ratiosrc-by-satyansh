const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ComponentType
} = require("discord.js");

module.exports = {
    name: "gdelete",
    aliases: ["giveawaydelete", "gcancel", "gremove"],
    description: "Delete a giveaway completely",
    category: "giveaway",
    usage: "<message_id/message_link>",
    examples: ["gdelete 1234567890", "gdelete https://discord.com/channels/..."],
    cooldown: 3,
    run: async (client, message, args, prefix) => {
        const arrow = client.emoji?.arrow || "▸";

        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ You need **Manage Server** permission.")
                ]
            });
        }

        if (!args[0]) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setTitle("<:ratio_gw:1453426990450343957> Delete Giveaway")
                        .setDescription(
                            `**Usage:** \`${prefix}gdelete <message_id/message_link>\`\n\n` +
                            `**Example:** \`${prefix}gdelete 1234567890123456789\``
                        )
                ]
            });
        }

        let messageId = args[0];
        
        if (messageId.includes("discord.com/channels/")) {
            const parts = messageId.split("/");
            messageId = parts[parts.length - 1];
        }

        const giveaway = await client.db.get(`giveaway_${messageId}`);
        
        if (!giveaway) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ No giveaway found with that message ID!")
                ]
            });
        }

        if (giveaway.guildId !== message.guild.id) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ That giveaway is not from this server!")
                ]
            });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor('#26272F')
            .setTitle("<:ratio_gw:1453426990450343957> Confirm Deletion")
            .setDescription(
                `${arrow} **Prize:** ${giveaway.prize}\n` +
                `${arrow} **Entries:** ${giveaway.entries?.length || 0}\n` +
                `${arrow} **Status:** ${giveaway.ended ? "Ended" : "Active"}\n\n` +
                `Are you sure you want to delete this giveaway?`
            );

        const confirmBtn = new ButtonBuilder()
            .setCustomId("gdelete_confirm")
            .setStyle(ButtonStyle.Danger)
            .setLabel("Delete")
            .setEmoji("🗑️");

        const cancelBtn = new ButtonBuilder()
            .setCustomId("gdelete_cancel")
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Cancel");

        const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

        const confirmMsg = await message.reply({
            embeds: [confirmEmbed],
            components: [row]
        });

        const collector = confirmMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i) => i.user.id === message.author.id,
            time: 30000,
            max: 1
        });

        collector.on("collect", async (interaction) => {
            if (interaction.customId === "gdelete_confirm") {
                try {
                    await client.db.delete(`giveaway_${messageId}`);
                    
                    let guildGiveaways = await client.db.get(`giveaways_${message.guild.id}`) || [];
                    guildGiveaways = guildGiveaways.filter(id => id !== messageId);
                    await client.db.set(`giveaways_${message.guild.id}`, guildGiveaways);

                    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
                    if (channel) {
                        const giveawayMsg = await channel.messages.fetch(messageId).catch(() => null);
                        if (giveawayMsg) {
                            await giveawayMsg.delete().catch(() => {});
                        }
                    }

                    await interaction.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#26272F')
                                .setDescription(`<:ratio_gw:1453426990450343957> Giveaway for **${giveaway.prize}** has been deleted!`)
                        ],
                        components: []
                    });
                } catch (error) {
                    console.error("Error deleting giveaway:", error);
                    await interaction.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#26272F')
                                .setDescription("❌ Failed to delete the giveaway. Please try again!")
                        ],
                        components: []
                    });
                }
            } else {
                await interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#26272F')
                            .setDescription("❌ Giveaway deletion cancelled.")
                    ],
                    components: []
                });
            }
        });

        collector.on("end", async (collected, reason) => {
            if (reason === "time" && collected.size === 0) {
                const disabledConfirmBtn = new ButtonBuilder()
                    .setCustomId("gdelete_confirm")
                    .setStyle(ButtonStyle.Danger)
                    .setLabel("Delete")
                    .setEmoji("🗑️")
                    .setDisabled(true);

                const disabledCancelBtn = new ButtonBuilder()
                    .setCustomId("gdelete_cancel")
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel("Cancel")
                    .setDisabled(true);

                const disabledRow = new ActionRowBuilder().addComponents(disabledConfirmBtn, disabledCancelBtn);

                await confirmMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#26272F')
                            .setTitle("<:ratio_gw:1453426990450343957> Deletion Timed Out")
                            .setDescription("The deletion request has expired.")
                    ],
                    components: [disabledRow]
                }).catch(() => {});
            }
        });
    }
};
