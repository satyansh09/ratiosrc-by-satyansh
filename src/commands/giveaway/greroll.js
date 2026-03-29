const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require("discord.js");

module.exports = {
    name: "greroll",
    aliases: ["giveawayreroll", "reroll"],
    description: "Reroll winners for an ended giveaway",
    category: "giveaway",
    usage: "<message_id/message_link> [winners]",
    examples: ["greroll 1234567890", "greroll 1234567890 2"],
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
                        .setTitle("<:ratio_gw:1453426990450343957> Reroll Giveaway")
                        .setDescription(
                            `**Usage:** \`${prefix}greroll <message_id/message_link> [winners]\`\n\n` +
                            `**Example:** \`${prefix}greroll 1234567890123456789\``
                        )
                ]
            });
        }

        let messageId = args[0];
        const newWinnerCount = parseInt(args[1]) || null;
        
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

        if (!giveaway.ended) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`❌ That giveaway hasn't ended yet! Use \`${prefix}gend\` to end it first.`)
                ]
            });
        }

        const entries = giveaway.entries || [];
        
        if (entries.length === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ No one entered that giveaway! Cannot reroll.")
                ]
            });
        }

        const winnersToSelect = newWinnerCount || giveaway.winners;
        
        if (winnersToSelect < 1 || winnersToSelect > 50) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ Winners count must be between 1 and 50!")
                ]
            });
        }

        const shuffled = [...entries].sort(() => Math.random() - 0.5);
        const newWinners = shuffled.slice(0, Math.min(winnersToSelect, entries.length));

        giveaway.winnerIds = newWinners;
        await client.db.set(`giveaway_${messageId}`, giveaway);

        const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
        if (!channel) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ Could not find the giveaway channel!")
                ]
            });
        }

        const giveawayMessage = await channel.messages.fetch(messageId).catch(() => null);
        const messageUrl = `https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${messageId}`;

        const winnerMentions = newWinners.map(id => `<@${id}>`).join(", ");
        
        if (giveawayMessage) {
            await giveawayMessage.reply({
                content: `<:ratio_gw:1453426990450343957> **Giveaway Rerolled!**\n\n` +
                        `${arrow} New winner(s): ${winnerMentions}\n` +
                        `${arrow} Prize: **${giveaway.prize}**\n` +
                        `${arrow} Rerolled by: ${message.author}`
            });
        }

        for (const winnerId of newWinners) {
            try {
                const winner = await client.users.fetch(winnerId).catch(() => null);
                if (winner) {
                    const dmEmbed = new EmbedBuilder()
                        .setColor('#26272F')
                        .setTitle("🎉 You Won a Giveaway (Reroll)!")
                        .setDescription(
                            `${arrow} **Prize:** ${giveaway.prize}\n` +
                            `${arrow} **Server:** ${message.guild.name}\n` +
                            `${arrow} **Host:** ${giveaway.hostTag}\n` +
                            `${arrow} **Rerolled by:** ${message.author.tag}`
                        )
                        .setThumbnail(message.guild.iconURL({ dynamic: true }))
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
                console.log(`Could not DM rerolled winner ${winnerId}`);
            }
        }

        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#26272F')
                    .setTitle("<:ratio_gw:1453426990450343957> Giveaway Rerolled")
                    .setDescription(
                        `${arrow} **Prize:** ${giveaway.prize}\n` +
                        `${arrow} **New Winners:** ${winnerMentions}`
                    )
                    .setTimestamp()
            ]
        });
    }
};
