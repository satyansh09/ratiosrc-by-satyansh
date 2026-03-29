const { PermissionFlagsBits } = require('discord.js');

module.exports = (client) => {
    client.on("guildBanAdd", async (ban) => {
        let immune = await client.db.get(`immune_${client.user.id}`) || [];
        if (immune.includes(ban.user.id)) {
            await ban.guild.bans.remove(ban.user.id, "Immune User");
            let invite = await ban.guild.channels.cache
                .filter(ch => ch.isTextBased() && ch.permissionsFor(ban.guild.me).has(PermissionFlagsBits.CreateInstantInvite))
                .first()
                ?.createInvite({ maxAge: 0, maxUses: 1 })
                .catch(() => null);
            if (invite) {
                try {
                    await ban.user.send(`You were banned from **${ban.guild.name}**, but you are immune. Invite back: ${invite.url}`);
                } catch { }
            }
        }
    });

    client.on("guildMemberRemove", async (member) => {
        let immune = await client.db.get(`immune_${client.user.id}`) || [];
        if (!immune.includes(member.id)) return;

        let logs = await member.guild.fetchAuditLogs({ limit: 1, type: 20 });
        let kickLog = logs.entries.first();
        if (kickLog && kickLog.target.id === member.id) {
            let invite = await member.guild.channels.cache
                .filter(ch => ch.isTextBased() && ch.permissionsFor(member.guild.me).has(PermissionFlagsBits.CreateInstantInvite))
                .first()
                ?.createInvite({ maxAge: 0, maxUses: 1 })
                .catch(() => null);
            if (invite) {
                try {
                    await member.send(`You were kicked from **${member.guild.name}**, but you are immune. Invite back: ${invite.url}`);
                } catch { }
            }
        }
    });

    client.on("guildMemberUpdate", async (oldMember, newMember) => {
        let immune = await client.db.get(`immune_${client.user.id}`) || [];
        if (!immune.includes(newMember.id)) return;

        if (newMember.isCommunicationDisabled()) {
            await newMember.timeout(null, "Immune User – timeout removed");
        }
    });
};
