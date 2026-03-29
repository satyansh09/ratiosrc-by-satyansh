const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'report',
    aliases: ['bug', 'feedback'],
    description: "Report a bug or send feedback to developers",
    category: 'util',
    cooldown: 3,
    run: async (client, message, args, prefix) => {
        if (!message.guild) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | This command can only be used in servers, not in DMs.`)]
            });
        }

        if (!args || args.length === 0) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | Please provide a report message.\nUsage: \`${prefix}report <your message>\``)]
            });
        }

        const reportMessage = args.join(' ');
        const reportChannelId = '1457477413087744115';

        try {
            const reportChannel = await client.channels.fetch(reportChannelId);
            
            if (!reportChannel) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Unable to send report. Please try again later.`)]
                });
            }

            const reportEmbed = new EmbedBuilder()
                .setColor('#26272F')
                .setTitle('📋 New Report')
                .addFields(
                    { name: '👤 By', value: `${message.author.tag} (${message.author.id})`, inline: false },
                    { name: '🏠 From', value: `${message.guild.name} (${message.guild.id})`, inline: false },
                    { name: '📝 Report', value: reportMessage, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `User ID: ${message.author.id}` });

            await reportChannel.send({ embeds: [reportEmbed] });

            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Your report has been successfully sent to the developers. Thank you for your feedback!`)]
            });

        } catch (error) {
            console.error('Error sending report:', error);
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | Failed to send report. Please try again later.`)]
            });
        }
    }
};
