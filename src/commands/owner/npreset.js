const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');

module.exports = {
    name: 'npreset',
    description: 'Reset the noprefix list',
    category: 'owner',
    cooldown: 3,
    async run(client, message) {
        const allowedUsers = ['760395853843136532', '133544778716413952'];
        if (!allowedUsers.includes(message.author.id)) {
            return message.reply('You do not have permission to use this command.');
        }

        const embed = new EmbedBuilder()
            .setColor('#26272F')
            .setTitle('Confirmation Required')
            .setDescription(
                '**Are you sure you want to reset the noprefix list?**\n\n' +
                'This action cannot be undone.\n' +
                'Click **Confirm** to proceed or **Cancel** to abort.'
            )
            .setFooter({ text: 'This request will expire in 30 minutes.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('npreset_confirm')
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('npreset_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.channel.send({
            embeds: [embed],
            components: [row]
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30 * 60 * 1000 // 30 minutes
        });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({
                    content: 'Only the command author can use these buttons.',
                    ephemeral: true
                });
            }

            if (interaction.customId === 'npreset_confirm') {
                await client.db.set('noprefix', []);

                const successEmbed = new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} The noprefix list has been reset.`);

                collector.stop('confirmed');
                await interaction.update({
                    embeds: [successEmbed],
                    components: []
                });
            }

            if (interaction.customId === 'npreset_cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription('❌ Action cancelled. The noprefix list was not changed.');

                collector.stop('cancelled');
                await interaction.update({
                    embeds: [cancelEmbed],
                    components: []
                });
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'time') {
                const expiredEmbed = new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription('⏰ Confirmation expired. Please run the command again.');

                await msg.edit({
                    embeds: [expiredEmbed],
                    components: []
                });
            }
        });
    }
};
