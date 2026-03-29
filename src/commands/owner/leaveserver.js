const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require('discord.js');

module.exports = {
    name: 'leaveserver',
    aliases: ['gl', 'gleave'],
    description: 'Leave a server by ID',
    category: 'owner',
    cooldown: 3,
    run: async (client, message, args) => {
        // Owner-only protection
        if (message.author.id !== '760395853843136532') return;

        // Guild ID or fallback to current guild
        const id = args[0];
        const guild = id ? await client.guilds.fetch(id).catch(() => null) : message.guild;

        if (!guild) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.color || 0xff0000)
                        .setDescription(`<:ratio_cross:1366804187555430463> | Invalid server ID or I’m not in that server.`)
                ]
            });
        }

        const name = guild.name || 'Unknown Server';

        // Confirmation buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_leave')
                .setLabel('✅ Yes, Leave')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_leave')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const confirmEmbed = new EmbedBuilder()
            .setColor(client.color || 0xffcc00)
            .setDescription(`⚠️ Are you sure you want me to leave **${name} (${guild.id})**?`);

        const msg = await message.channel.send({
            embeds: [confirmEmbed],
            components: [row],
        });

        const collector = msg.createMessageComponentCollector({
            time: 15000,
            filter: (i) => i.user.id === message.author.id,
        });

        collector.on('collect', async (i) => {
            await i.deferUpdate();
            if (i.customId === 'cancel_leave') {
                collector.stop('cancelled');
                return msg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(client.color || 0x00ff00)
                            .setDescription(`❎ Cancelled leaving **${name}**.`)
                    ],
                    components: [],
                });
            }

            if (i.customId === 'confirm_leave') {
                collector.stop('confirmed');
                await message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(client.color || 0xff9900)
                            .setDescription(`📤 Left the guild **${name}**.\nReason: Requested by Owner\nExecutor: <@760395853843136532>`)
                    ],
                });

                await guild.leave().catch(() => null);

                return msg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(client.color || 0x00ff00)
                            .setDescription(`<:ratio_tick:1366804156320583772> | Successfully left **${name} (${guild.id})**.`)
                    ],
                    components: [],
                });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                msg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(client.color || 0x999999)
                            .setDescription(`⌛ Confirmation timed out. Did not leave **${name}**.`)
                    ],
                    components: [],
                });
            }
        });
    },
};
