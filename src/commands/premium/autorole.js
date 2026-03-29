const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const DANGEROUS_PERMISSIONS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.MentionEveryone,
];

module.exports = {
    name: 'autorole',
    aliases: ['ar'],
    description: 'Automatically assign roles to new members (Premium)',
    category: 'premium',
    cooldown: 5,
    premium: true,
    run: async (client, message, args, prefix) => {
        if (!message.member.permissions.has('ManageRoles')) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | You need \`MANAGE_ROLES\` permission to use this command.`)]
            });
        }

        const subCommand = args[0]?.toLowerCase();
        const currentSettings = await client.db.get(`autorole_${message.guild.id}`) || { enabled: false, roles: [], botRoles: [] };

        if (!subCommand) {
            const humanRoles = currentSettings.roles?.map(id => `<@&${id}>`).join(', ') || 'None';
            const botRoles = currentSettings.botRoles?.map(id => `<@&${id}>`).join(', ') || 'None';

            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setTitle('💎 Auto Role System')
                    .setDescription(
                        `**Status:** ${currentSettings.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
                        `**Human Roles:** ${humanRoles}\n` +
                        `**Bot Roles:** ${botRoles}\n\n` +
                        `**Commands:**\n` +
                        `\`${prefix}autorole enable\` - Enable autorole\n` +
                        `\`${prefix}autorole disable\` - Disable autorole\n` +
                        `\`${prefix}autorole add <human/bot> @role\` - Add a role\n` +
                        `\`${prefix}autorole remove <human/bot> @role\` - Remove a role\n` +
                        `\`${prefix}autorole clear\` - Clear all roles`
                    )
                    .setFooter({ text: 'Premium Feature', iconURL: client.user.displayAvatarURL() })]
            });
        }

        if (subCommand === 'enable') {
            currentSettings.enabled = true;
            await client.db.set(`autorole_${message.guild.id}`, currentSettings);
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Auto Role has been enabled.`)]
            });
        }

        if (subCommand === 'disable') {
            currentSettings.enabled = false;
            await client.db.set(`autorole_${message.guild.id}`, currentSettings);
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Auto Role has been disabled.`)]
            });
        }

        if (subCommand === 'add') {
            const type = args[1]?.toLowerCase();
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);

            if (!['human', 'bot'].includes(type)) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Type must be \`human\` or \`bot\`.`)]
                });
            }

            if (!role) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Please mention a valid role.`)]
                });
            }

            // Check for dangerous permissions
            if (DANGEROUS_PERMISSIONS.some(p => role.permissions.has(p))) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | I cannot add this role because it has dangerous permissions.`)]
                });
            }

            if (role.position >= message.guild.members.me.roles.highest.position) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | I cannot assign this role as it's higher than my highest role.`)]
                });
            }

            const roleArray = type === 'human' ? 'roles' : 'botRoles';
            if (!currentSettings[roleArray]) currentSettings[roleArray] = [];
            
            if (currentSettings[roleArray].includes(role.id)) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | This role is already in the ${type} autorole list.`)]
                });
            }

            currentSettings[roleArray].push(role.id);
            await client.db.set(`autorole_${message.guild.id}`, currentSettings);

            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Added ${role} to ${type} autorole list.`)]
            });
        }

        if (subCommand === 'remove') {
            const type = args[1]?.toLowerCase();
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);

            if (!['human', 'bot'].includes(type)) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Type must be \`human\` or \`bot\`.`)]
                });
            }

            if (!role) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | Please mention a valid role.`)]
                });
            }

            const roleArray = type === 'human' ? 'roles' : 'botRoles';
            if (!currentSettings[roleArray]?.includes(role.id)) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('#26272F')
                        .setDescription(`${client.emoji.cross} | This role is not in the ${type} autorole list.`)]
                });
            }

            currentSettings[roleArray] = currentSettings[roleArray].filter(id => id !== role.id);
            await client.db.set(`autorole_${message.guild.id}`, currentSettings);

            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Removed ${role} from ${type} autorole list.`)]
            });
        }

        if (subCommand === 'clear') {
            await client.db.set(`autorole_${message.guild.id}`, { enabled: false, roles: [], botRoles: [] });
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.tick} | Cleared all autorole settings.`)]
            });
        }
    }
};
