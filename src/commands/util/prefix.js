const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'prefix',
    aliases: ['setprefix', 'set-prefix'],
    description: "View or change the server prefix",
    category: 'util',
    cooldown: 3,
    run: async (client, message, args, prefix) => {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | You require \`MANAGE_GUILD\` permissions to change guild prefix.`)]
            });
        }

        if (!args[0]) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setDescription(`My prefix for the server is: \`${prefix}\``)
                    .setColor('#26272F')]
            });
        }

        if (args[0].length > 3) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | You cannot set more than a triple argument as prefix.`)]
            });
        }

        if (args[1]) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | You cannot set 2nd args as prefix`)]
            });
        }

        if (args[0] === client.config.prefix) {
            await client.db.delete(`prefix_${message.guild.id}`);
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Successfully reset the guild prefix to - \`${client.config.prefix}\``)]
            });
        }

        await client.db.set(`prefix_${message.guild.id}`, args[0]);
        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor('#26272F')
                .setDescription(`${client.emoji.tick} | Guild prefix has been set to - \`${args[0]}\``)]
        });
    }
}