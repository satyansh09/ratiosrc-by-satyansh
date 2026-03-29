const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'antialt',
    aliases: ['altdetect'],
    description: 'Block new/alt accounts from joining (Premium)',
    category: 'premium',
    cooldown: 5,
    premium: true,
    run: async (client, message, args, prefix) => {
        if (!message.member.permissions.has('ManageGuild')) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | You need \`MANAGE_GUILD\` permission to use this command.`)]
            });
        }

        const subCommand = args[0]?.toLowerCase();
        const currentSetting = await client.db.get(`antialt_${message.guild.id}`);

        if (!subCommand) {
            const embed = new EmbedBuilder()
                .setColor('#26272F')
                .setTitle('💎 Anti-Alt System')
                .setDescription(
                    `**Current Status:** ${currentSetting?.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                    `**Minimum Account Age:** ${currentSetting?.minAge || 7} days\n` +
                    `**Action:** ${currentSetting?.action || 'kick'}\n\n` +
                    `**Commands:**\n` +
                    `\`${prefix}antialt enable <days>\` - Enable with minimum age\n` +
                    `\`${prefix}antialt disable\` - Disable anti-alt\n` +
                    `\`${prefix}antialt action <kick/ban>\` - Set action for alt accounts`
                )
                .setFooter({ text: 'Premium Feature', iconURL: client.user.displayAvatarURL() });

            return message.channel.send({ embeds: [embed] });
        }

        if (subCommand === 'enable') {
            const days = parseInt(args[1]) || 7;
            if (days < 1 || days > 365) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Days must be between 1 and 365.`)]
                });
            }

            await client.db.set(`antialt_${message.guild.id}`, {
                enabled: true,
                minAge: days,
                action: currentSetting?.action || 'kick'
            });

            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Anti-Alt enabled! Accounts younger than **${days} days** will be blocked.`)]
            });
        }

        if (subCommand === 'disable') {
            await client.db.set(`antialt_${message.guild.id}`, { enabled: false });
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Anti-Alt has been disabled.`)]
            });
        }

        if (subCommand === 'action') {
            const action = args[1]?.toLowerCase();
            if (!['kick', 'ban'].includes(action)) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Action must be \`kick\` or \`ban\`.`)]
                });
            }

            await client.db.set(`antialt_${message.guild.id}`, {
                ...currentSetting,
                action: action
            });

            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Alt accounts will now be **${action}ed**.`)]
            });
        }
    }
};
