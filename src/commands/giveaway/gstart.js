const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits
} = require("discord.js");
const ms = require("ms");
const { scheduleGiveaway } = require("../../utils/giveawayUtils");

module.exports = {
    name: "gstart",
    aliases: ["giveawaystart", "gcreate"],
    description: "Start a new giveaway",
    category: "giveaway",
    usage: "<time> <winners> <prize>",
    examples: ["gstart 1h 1 Nitro", "gstart 30m 2 Discord Nitro Classic"],
    cooldown: 5,
    run: async (client, message, args, prefix) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ You need **Manage Server** permission.")
                ]
            });
        }

        if (args.length < 3) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setTitle("<:ratio_gw:1453426990450343957> Giveaway Setup")
                        .setDescription(
                            `**Usage:** \`${prefix}gstart <time> <winners> <prize>\`\n\n` +
                            `**Example:** \`${prefix}gstart 1h 1 Discord Nitro\``
                        )
                ]
            });
        }

        const timeArg = args[0];
        const winnersArg = args[1];
        const prize = args.slice(2).join(" ");

        const duration = ms(timeArg);
        if (!duration || duration < 10000) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ Please provide a valid duration! (Minimum: 10 seconds)")
                ]
            });
        }

        if (duration > 30 * 24 * 60 * 60 * 1000) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ Maximum giveaway duration is 30 days!")
                ]
            });
        }

        const winners = parseInt(winnersArg);
        if (isNaN(winners) || winners < 1 || winners > 50) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ Please provide a valid number of winners! (1-50)")
                ]
            });
        }

        if (!prize || prize.length > 256) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ Please provide a valid prize! (Max 256 characters)")
                ]
            });
        }

        const endTime = Date.now() + duration;
        const endTimestamp = Math.floor(endTime / 1000);
        const arrow = client.emoji?.arrow || "▸";

        const giveawayEmbed = new EmbedBuilder()
            .setColor('#26272F')
            .setTitle("<:ratio_gw:1453426990450343957> Giveaway <:ratio_gw:1453426990450343957>")
            .setDescription(
                `${arrow} **Prize:** ${prize}\n` +
                `${arrow} **Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:t>)\n` +
                `${arrow} **Winners:** ${winners}\n` +
                `${arrow} **Host:** ${message.author}`
            )
            .setTimestamp(endTime);

        const enterButton = new ButtonBuilder()
            .setCustomId("giveaway_enter")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<:ratio_gw:1453426990450343957>")
            .setLabel("Enter");

        const entriesButton = new ButtonBuilder()
            .setCustomId("giveaway_entries_display")
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Entries: 0")
            .setDisabled(true);

        const row = new ActionRowBuilder().addComponents(enterButton, entriesButton);

        try {
            await message.delete().catch(() => {});

            const giveawayMessage = await message.channel.send({
                embeds: [giveawayEmbed],
                components: [row]
            });

            const giveawayData = {
                messageId: giveawayMessage.id,
                channelId: message.channel.id,
                guildId: message.guild.id,
                prize: prize,
                winners: winners,
                hostId: message.author.id,
                hostTag: message.author.tag,
                startTime: Date.now(),
                endTime: endTime,
                entries: [],
                status: true,
                ended: false
            };

            await client.db.set(`giveaway_${giveawayMessage.id}`, giveawayData);

            let guildGiveaways = await client.db.get(`giveaways_${message.guild.id}`) || [];
            guildGiveaways.push(giveawayMessage.id);
            await client.db.set(`giveaways_${message.guild.id}`, guildGiveaways);

            scheduleGiveaway(client, giveawayData);

        } catch (error) {
            console.error("Error starting giveaway:", error);
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ Failed to start the giveaway. Please try again!")
                ]
            });
        }
    }
};
