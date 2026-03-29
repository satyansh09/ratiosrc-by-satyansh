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
    name: 'massrole',
    aliases: ['mrole'],
    description: 'Add or remove roles from all members (Premium)',
    category: 'premium',
    cooldown: 30,
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
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

        if (!subCommand || !['add', 'remove', 'humans', 'bots'].includes(subCommand)) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setTitle('💎 Mass Role')
                    .setDescription(
                        `**Usage:**\n` +
                        `\`${prefix}massrole add @role\` - Add role to all members\n` +
                        `\`${prefix}massrole remove @role\` - Remove role from all members\n` +
                        `\`${prefix}massrole humans @role\` - Add role to all humans\n` +
                        `\`${prefix}massrole bots @role\` - Add role to all bots`
                    )
                    .setFooter({ text: 'Premium Feature', iconURL: client.user.displayAvatarURL() })]
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
                    .setDescription(`${client.emoji.cross} | I cannot manage this role because it has dangerous permissions (Administrator, Ban, etc.).`)]
            });
        }

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#26272F')
                    .setDescription(`${client.emoji.cross} | I cannot manage this role as it's higher than my highest role.`)]
            });
        }

        const statusMsg = await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor('#26272F')
                .setDescription(`⏳ Processing mass role operation... This may take a while.`)]
        });

        let members = await message.guild.members.fetch();
        let successCount = 0;
        let failCount = 0;

        if (subCommand === 'humans') {
            members = members.filter(m => !m.user.bot);
        } else if (subCommand === 'bots') {
            members = members.filter(m => m.user.bot);
        }

        const isAdding = subCommand === 'add' || subCommand === 'humans' || subCommand === 'bots';
        const reason = `Mass Role ${isAdding ? 'Addition' : 'Removal'} by ${message.author.tag} (${message.author.id})`;

        for (const [, member] of members) {
            try {
                if (isAdding && !member.roles.cache.has(role.id)) {
                    await member.roles.add(role, reason);
                    successCount++;
                } else if (subCommand === 'remove' && member.roles.cache.has(role.id)) {
                    await member.roles.remove(role, reason);
                    successCount++;
                }
                await new Promise(r => setTimeout(r, 100));
            } catch {
                failCount++;
            }
        }

        await statusMsg.edit({
            embeds: [new EmbedBuilder()
                .setColor('#26272F')
                .setTitle('Mass Role Complete')
                .setDescription(
                    `${client.emoji.tick} | Operation completed!\n\n` +
                    `**Role:** ${role}\n` +
                    `**Action:** ${isAdding ? 'Added' : 'Removed'}\n` +
                    `**Success:** \`${successCount}\`\n` +
                    `**Failed:** \`${failCount}\``
                )]
        });
    }
};
