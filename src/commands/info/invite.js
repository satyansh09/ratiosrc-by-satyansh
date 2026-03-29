const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    name: "invite",
    aliases: ["inv", "botinvite"],
    description: "Get the bot invite link and support server",
    category: "info",
    cooldown: 3,
    run: async (client, message, args, prefix) => {
        const inviteURL = "https://dsc.gg/ratiogg";
        const supportURL = "https://discord.gg/hDHa6Ru2j6";

        const embed = new EmbedBuilder()
            .setColor('#26272F')
            .setDescription(
                `**Thanks for choosing ${client.user.username}!**\n\n` +
                `Click the buttons below to invite me or join our support community.`
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("Invite Me")
                .setStyle(ButtonStyle.Link)
                .setURL(inviteURL)
                .setEmoji("1461812701973053480"),
            new ButtonBuilder()
                .setLabel("Support Server")
                .setStyle(ButtonStyle.Link)
                .setURL(supportURL)
                .setEmoji("1461812634167808091")
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }
};
