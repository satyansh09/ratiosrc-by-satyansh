const { EmbedBuilder } = require('discord.js');

async function hasGuildPremium(client, guildId) {
    const guildPremium = await client.db.get(`premium_guild_${guildId}`);
    if (guildPremium && Date.now() < guildPremium.expiresAt) {
        return true;
    }
    return false;
}

module.exports = async (client) => {
    client.on('guildMemberAdd', async (member) => {
        const autoroleSettings = await client.db.get(`autorole_${member.guild.id}`);
        if (autoroleSettings?.enabled) {
            const hasPremium = await hasGuildPremium(client, member.guild.id);
            if (hasPremium) {
                const rolesToAdd = member.user.bot ? autoroleSettings.botRoles : autoroleSettings.roles;
                const reason = `Autorole addition for ${member.user.tag}`;
                if (rolesToAdd && rolesToAdd.length > 0) {
                    for (const roleId of rolesToAdd) {
                        try {
                            const role = member.guild.roles.cache.get(roleId);
                            if (role && role.position < member.guild.members.me.roles.highest.position) {
                                await member.roles.add(role, reason).catch(() => {});
                            }
                        } catch {}
                    }
                }
            }
        }

        const antialtSettings = await client.db.get(`antialt_${member.guild.id}`);
        if (antialtSettings?.enabled) {
            const hasPremium = await hasGuildPremium(client, member.guild.id);
            if (hasPremium) {
                const accountAge = Date.now() - member.user.createdTimestamp;
                const minAgeDays = antialtSettings.minAge || 7;
                const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;

                if (accountAge < minAgeMs) {
                    const action = antialtSettings.action || 'kick';
                    try {
                        await member.send({
                            embeds: [new EmbedBuilder()
                                .setColor('#26272F')
                                .setTitle('Anti-Alt Detection')
                                .setDescription(`You have been ${action}ed from **${member.guild.name}** because your account is too new.\n\nMinimum account age required: **${minAgeDays} days**`)
                                .setTimestamp()]
                        }).catch(() => {});

                        if (action === 'ban') {
                            await member.ban({ reason: `[Anti-Alt] Account age: ${Math.floor(accountAge / 86400000)} days` });
                        } else {
                            await member.kick(`[Anti-Alt] Account age: ${Math.floor(accountAge / 86400000)} days`);
                        }
                    } catch {}
                }
            }
        }
    });
};
