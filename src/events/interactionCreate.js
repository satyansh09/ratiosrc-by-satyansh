const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

module.exports = (client) => {
    client.on("interactionCreate", async (interaction) => {
        if (interaction.isChatInputCommand()) {
            const cmd = client.commands.get(interaction.commandName);
            if (!cmd || !cmd.runSlash) return;

            try {
                await cmd.runSlash(client, interaction);
            } catch (err) {
                console.error(`[Slash Command Error] ${interaction.commandName}:`, err);
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF4B4B')
                    .setDescription("An error occurred while executing this command.");
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
                }
            }
            return;
        }

        if (!interaction.isButton()) return;

        if (interaction.customId === "giveaway_enter") {
            const giveaway = await client.db.get(`giveaway_${interaction.message.id}`);
            const arrow = client.emoji?.arrow || "▸";
            
            if (!giveaway) {
                return interaction.reply({ 
                    content: "❌ This giveaway no longer exists!", 
                    flags: 64 
                });
            }

            if (!giveaway.status || giveaway.ended) {
                return interaction.reply({ 
                    content: "❌ This giveaway has already ended!", 
                    flags: 64 
                });
            }

            if (giveaway.entries.includes(interaction.user.id)) {
                giveaway.entries = giveaway.entries.filter(id => id !== interaction.user.id);
                await client.db.set(`giveaway_${interaction.message.id}`, giveaway);

                const enterBtn = new ButtonBuilder()
                    .setCustomId("giveaway_enter")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("<:ratio_gw:1453426990450343957>")
                    .setLabel("Enter");

                const entriesBtn = new ButtonBuilder()
                    .setCustomId("giveaway_entries_display")
                    .setStyle(ButtonStyle.Secondary)
                    .setLabel(`Entries: ${giveaway.entries.length}`)
                    .setDisabled(true);

                const row = new ActionRowBuilder().addComponents(enterBtn, entriesBtn);

                await interaction.message.edit({ components: [row] }).catch(() => {});

                return interaction.reply({ 
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#26272F')
                            .setDescription(`${arrow} You left the giveaway for **${giveaway.prize}**`)
                    ],
                    flags: 64 
                });
            }

            giveaway.entries.push(interaction.user.id);
            await client.db.set(`giveaway_${interaction.message.id}`, giveaway);

            const enterBtn = new ButtonBuilder()
                .setCustomId("giveaway_enter")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("<:ratio_gw:1453426990450343957>")
                .setLabel("Enter");

            const entriesBtn = new ButtonBuilder()
                .setCustomId("giveaway_entries_display")
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`Entries: ${giveaway.entries.length}`)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(enterBtn, entriesBtn);

            await interaction.message.edit({ components: [row] }).catch(() => {});

            const endTimestamp = Math.floor(giveaway.endTime / 1000);
            
            return interaction.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(
                            `<:ratio_gw:1453426990450343957> **You entered the giveaway!**\n\n` +
                            `${arrow} **Prize:** ${giveaway.prize}\n` +
                            `${arrow} **Ends:** <t:${endTimestamp}:R>`
                        )
                ],
                flags: 64 
            });
        }

        if (interaction.customId === "giveaway_entries_display" || 
            interaction.customId === "giveaway_entries_ended" ||
            interaction.customId === "giveaway_ended") {
            return;
        }

        if (interaction.customId === "cmd_delete") {
            if (interaction.message.interaction?.user?.id !== interaction.user.id) {
                return interaction.reply({ 
                    content: "You cannot delete this message!", 
                    flags: 64 
                });
            }
            await interaction.message.delete().catch(() => {});
        }
    });
};
