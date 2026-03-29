const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require("discord.js");

function scheduleGiveaway(client, giveawayData) {
    const timeLeft = giveawayData.endTime - Date.now();
    
    if (timeLeft <= 0) {
        endGiveaway(client, giveawayData.messageId);
        return;
    }

    if (timeLeft <= 2147483647) {
        setTimeout(async () => {
            const currentData = await client.db.get(`giveaway_${giveawayData.messageId}`);
            if (currentData && currentData.status && !currentData.ended) {
                await endGiveaway(client, giveawayData.messageId);
            }
        }, timeLeft);
    }
}

async function endGiveaway(client, messageId) {
    try {
        const giveaway = await client.db.get(`giveaway_${messageId}`);
        if (!giveaway || giveaway.ended) return;

        const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
        if (!channel) {
            giveaway.status = false;
            giveaway.ended = true;
            await client.db.set(`giveaway_${messageId}`, giveaway);
            return;
        }

        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message) {
            giveaway.status = false;
            giveaway.ended = true;
            await client.db.set(`giveaway_${messageId}`, giveaway);
            return;
        }

        giveaway.status = false;
        giveaway.ended = true;

        const entries = giveaway.entries || [];
        let winnerIds = [];

        if (entries.length > 0) {
            const shuffled = [...entries].sort(() => Math.random() - 0.5);
            winnerIds = shuffled.slice(0, Math.min(giveaway.winners, entries.length));
        }

        giveaway.winnerIds = winnerIds;
        await client.db.set(`giveaway_${messageId}`, giveaway);

        const arrow = client.emoji?.arrow || "▸";

        const endedEmbed = new EmbedBuilder()
            .setColor('#26272F')
            .setTitle("<:ratio_gw:1453426990450343957> Giveaway Ended")
            .setDescription(
                `${arrow} **Prize:** ${giveaway.prize}\n` +
                `${arrow} **Winners:** ${winnerIds.length ? winnerIds.map(id => `<@${id}>`).join(", ") : "None"}\n` +
                `${arrow} **Host:** <@${giveaway.hostId}>`
            )
            .setTimestamp();

        const endedButton = new ButtonBuilder()
            .setCustomId("giveaway_ended")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<:ratio_gw:1453426990450343957>")
            .setLabel("Ended")
            .setDisabled(true);

        const entriesButton = new ButtonBuilder()
            .setCustomId("giveaway_entries_ended")
            .setStyle(ButtonStyle.Secondary)
            .setLabel(`Entries: ${entries.length}`)
            .setDisabled(true);

        const row = new ActionRowBuilder().addComponents(endedButton, entriesButton);

        await message.edit({
            embeds: [endedEmbed],
            components: [row]
        }).catch(() => {});

        if (winnerIds.length > 0) {
            const messageUrl = `https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${messageId}`;
            
            const winnerMentions = winnerIds.map(id => `<@${id}>`).join(", ");
            await message.reply({
                content: `<:ratio_gw:1453426990450343957> **Congratulations** ${winnerMentions}! You won **${giveaway.prize}**\n${arrow} Hosted by: <@${giveaway.hostId}>`
            }).catch(() => {});

            for (const winnerId of winnerIds) {
                try {
                    const winner = await client.users.fetch(winnerId).catch(() => null);
                    if (winner) {
                        const dmEmbed = new EmbedBuilder()
                            .setColor('#26272F')
                            .setTitle("🎉 You Won a Giveaway!")
                            .setDescription(
                                `${arrow} **Prize:** ${giveaway.prize}\n` +
                                `${arrow} **Server:** ${channel.guild.name}\n` +
                                `${arrow} **Host:** ${giveaway.hostTag}`
                            )
                            .setThumbnail(channel.guild.iconURL({ dynamic: true }))
                            .setTimestamp();

                        const linkButton = new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Go to Giveaway")
                            .setURL(messageUrl)
                            .setEmoji("🔗");

                        const dmRow = new ActionRowBuilder().addComponents(linkButton);

                        await winner.send({
                            embeds: [dmEmbed],
                            components: [dmRow]
                        }).catch(() => {});
                    }
                } catch (err) {
                }
            }
        }

        console.log(`[🎉] Giveaway ended: ${giveaway.prize} (${messageId})`);
    } catch (error) {
        console.error("[🎉] Error ending giveaway:", error);
    }
}

module.exports = {
    scheduleGiveaway,
    endGiveaway
};
