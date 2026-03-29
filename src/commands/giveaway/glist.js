const { 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require("discord.js");

module.exports = {
    name: "glist",
    aliases: ["giveawaylist", "giveaways", "activegiveaways"],
    description: "List all active giveaways in the server",
    category: "giveaway",
    cooldown: 5,
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

        const guildGiveaways = await client.db.get(`giveaways_${message.guild.id}`) || [];
        
        if (guildGiveaways.length === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setTitle("<:ratio_gw:1453426990450343957> Giveaway List")
                        .setDescription(
                            `No giveaways found in this server!\n\n` +
                            `Use \`${prefix}gstart <time> <winners> <prize>\` to create one!`
                        )
                ]
            });
        }

        const activeGiveaways = [];
        const endedGiveaways = [];

        for (const msgId of guildGiveaways) {
            const giveaway = await client.db.get(`giveaway_${msgId}`);
            if (giveaway) {
                if (giveaway.status && !giveaway.ended) {
                    activeGiveaways.push(giveaway);
                } else {
                    endedGiveaways.push(giveaway);
                }
            }
        }

        if (activeGiveaways.length === 0 && endedGiveaways.length === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#26272F')
                        .setTitle("<:ratio_gw:1453426990450343957> Giveaway List")
                        .setDescription(
                            `No giveaways found in this server!\n\n` +
                            `Use \`${prefix}gstart <time> <winners> <prize>\` to create one!`
                        )
                ]
            });
        }

        let description = "";

        if (activeGiveaways.length > 0) {
            description += "**Active Giveaways:**\n\n";
            
            for (const g of activeGiveaways.slice(0, 10)) {
                const endTimestamp = Math.floor(g.endTime / 1000);
                const messageUrl = `https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId}`;
                
                description += `${arrow} **${g.prize}**\n`;
                description += `${arrow} Winners: \`${g.winners}\` | Entries: \`${g.entries?.length || 0}\`\n`;
                description += `${arrow} Ends: <t:${endTimestamp}:R>\n`;
                description += `${arrow} [Jump to Giveaway](${messageUrl})\n\n`;
            }

            if (activeGiveaways.length > 10) {
                description += `*...and ${activeGiveaways.length - 10} more active giveaways*\n\n`;
            }
        }

        if (endedGiveaways.length > 0) {
            description += "**Ended Giveaways:**\n\n";
            
            const recentEnded = endedGiveaways.slice(-5).reverse();
            
            for (const g of recentEnded) {
                const messageUrl = `https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId}`;
                const winners = g.winnerIds?.length > 0 
                    ? g.winnerIds.map(id => `<@${id}>`).join(", ")
                    : "None";
                
                description += `${arrow} **${g.prize}**\n`;
                description += `${arrow} Winners: ${winners}\n`;
                description += `${arrow} Entries: \`${g.entries?.length || 0}\`\n`;
                description += `${arrow} [Jump to Giveaway](${messageUrl})\n\n`;
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#26272F')
            .setTitle("<:ratio_gw:1453426990450343957> Giveaway List")
            .setDescription(description)
            .setFooter({ 
                text: `Active: ${activeGiveaways.length} | Total: ${guildGiveaways.length}` 
            })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
