const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

module.exports = {
    name: "lockall",
    aliases: [],
    description: "Lock all text channels to prevent @everyone from sending messages",
    category: "moderation",
    cooldown: 10,
    run: async (client, message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | You need \`Administrator\` permission to use this command.`)]
            });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | I need \`Manage Channels\` permission to lock channels.`)]
            });
        }

        const loadingMsg = await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor('#26272F')
                .setDescription(`<a:loading:1428487794854203585> Locking all channels...`)]
        });

        const channels = message.guild.channels.cache.filter(
            c => c.type === ChannelType.GuildText
        );

        let success = 0;
        let failed = 0;

        for (const [, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });
                success++;
            } catch {
                failed++;
            }
        }

        return loadingMsg.edit({
            embeds: [new EmbedBuilder()
                .setColor('#26272F')
                .setDescription(`${client.emoji.tick} | Locked **${success}** channels. Failed: **${failed}**`)]
        });
    }
};
