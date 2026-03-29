const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { endGiveaway } = require("../../utils/giveawayUtils");

module.exports = {
    name: "gend",
    aliases: ["giveawayend", "endgiveaway"],
    description: "End a giveaway immediately",
    category: "giveaway",
    usage: "<message_id/message_link>",
    examples: ["gend 1234567890", "gend https://discord.com/channels/..."],
    cooldown: 3,
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

        if (!args[0]) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setTitle("<:ratio_gw:1453426990450343957> End Giveaway")
                        .setDescription(
                            `**Usage:** \`${prefix}gend <message_id/message_link>\`\n\n` +
                            `**Example:** \`${prefix}gend 1234567890123456789\``
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

        if (giveaway.ended) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ That giveaway has already ended!")
                ]
            });
        }

        const loadingMsg = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription("<:ratio_gw:1453426990450343957> Ending the giveaway...")
            ]
        });

        try {
            await endGiveaway(client, messageId);

            await loadingMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`<:ratio_gw:1453426990450343957> Giveaway for **${giveaway.prize}** has been ended!`)
                ]
            });
        } catch (error) {
            console.error("Error ending giveaway:", error);
            await loadingMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription("❌ Failed to end the giveaway. Please try again!")
                ]
            });
        }
    }
};
