const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "unlock",
    aliases: [],
    description: "Unlock a channel to allow @everyone to send messages",
    category: "moderation",
    cooldown: 3,
    run: async (client, message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | You need \`Manage Channels\` permission to use this command.`)]
            });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | I need \`Manage Channels\` permission to unlock channels.`)]
            });
        }

        const channel = message.mentions.channels.first() || message.channel;

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: null
            });

            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Successfully unlocked ${channel}.`)]
            });
        } catch (error) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | Failed to unlock the channel.`)]
            });
        }
    }
};
