const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    SeparatorSpacingSize,
    ButtonStyle,
    MessageFlags,
    version: djsVersion,
} = require("discord.js");
const os = require("os");

module.exports = {
    name: "stats",
    aliases: ["botstats", "botstatus", "st"],
    description: "View bot statistics and performance info",
    category: "util",
    cooldown: 3,

    run: async (client, message) => {
        const botGuilds   = client.guilds.cache.size;
        const usersCount  = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        const botChannels = client.channels.cache.size;
        const commands    = client.commands?.size ?? 0;
        const botPing     = client.ws.ping.toFixed(0);
        const nodeVersion = process.version;

        const uptime    = process.uptime();
        const days      = Math.floor(uptime / 86400);
        const hours     = Math.floor((uptime % 86400) / 3600);
        const minutes   = Math.floor((uptime % 3600) / 60);
        const uptimeStr = days > 0
            ? `${days}d ${hours}h ${minutes}m`
            : hours > 0
                ? `${hours}h ${minutes}m`
                : `${minutes}m`;

        let dbLatency = 0;
        try {
            const start = process.hrtime.bigint();
            client.lmdb.get("pingTest");
            const end = process.hrtime.bigint();
            dbLatency = Number(end - start) / 1e6;
        } catch (err) {
            console.error(err);
        }

        const guildShardId = message.guild.shardId;
        const clusterId    = client.cluster?.id ?? 0;
        const totalShards  = client.cluster?.info?.TOTAL_SHARDS ?? client.options.shardCount ?? 1;

        const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

        const container = new ContainerBuilder()
            .setAccentColor(0x26272F)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${client.user.username}`)
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**General**\n` +
                    `Servers : \`${botGuilds.toLocaleString()}\`\n` +
                    `Users : \`${usersCount.toLocaleString()}\`\n` +
                    `Channels : \`${botChannels.toLocaleString()}\`\n` +
                    `Commands : \`${commands}\``
                )
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Performance**\n` +
                    `Ping : \`${botPing}ms\`\n` +
                    `Database : \`${dbLatency.toFixed(3)}ms\`\n` +
                    `Uptime : \`${uptimeStr}\``
                )
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**System**\n` +
                    `Node.js : \`${nodeVersion}\`\n` +
                    `Discord.js : \`v${djsVersion}\`\n` +
                    `Platform : \`${os.platform()}\``
                )
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Sharding**\n` +
                    `Shard : \`${guildShardId + 1}/${totalShards}\`\n` +
                    `Cluster : \`${clusterId}\``
                )
            )
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Requested by ${message.author.tag}`)
            )
            .addActionRowComponents((row) =>
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel("Invite")
                        .setURL("https://dsc.gg/ratiogg")
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setLabel("Support")
                        .setURL("https://discord.gg/JYVNdTve2d")
                        .setStyle(ButtonStyle.Link)
                )
            );

        return message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};