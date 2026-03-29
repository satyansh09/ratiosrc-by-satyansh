const { EmbedBuilder } = require("discord.js");

function safeFormat(text, placeholders) {
    if (!text) return "";
    return text.replace(/\{(\w+)\}/gi, (_, key) => {
        return String(placeholders[key.toLowerCase()] ?? `{${key}}`);
    });
}

module.exports = (client) => {
    client.on("guildMemberAdd", async (member) => {
        const guild = member.guild;
        const guildKey = `greet_${guild.id}`;

        const config = await client.db.get(guildKey);
        if (!config || !config.channelId) return;

        const welcomeChannel = guild.channels.cache.get(config.channelId);
        if (!welcomeChannel) return;

        const placeholders = {
            user: `<@${member.id}>`,
            user_avatar: member.user.displayAvatarURL({ dynamic: true }),
            user_name: member.user.username,
            user_id: member.id,
            user_nick: member.displayName,
            user_joindate: member.joinedAt
                ? member.joinedAt.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
                : "Unknown",
            user_createdate: member.user.createdAt.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }),
            server_name: guild.name,
            server_id: guild.id,
            server_membercount: guild.memberCount,
            server_icon: guild.iconURL({ dynamic: true }) ?? "https://cdn.discordapp.com/embed/avatars/0.png"
        };

        let sent;

        if (config.type === "embed") {
            const ed = config.embedData;

            const embed = new EmbedBuilder()
                .setTitle(safeFormat(ed.title, placeholders) || null)
                .setDescription(safeFormat(ed.description, placeholders) || null)
                .setColor(ed.color ?? 0xE6E6FA)
                .setTimestamp();

            if (ed.footer_text) {
                embed.setFooter({
                    text: safeFormat(ed.footer_text, placeholders),
                    iconURL: safeFormat(ed.footer_icon, placeholders) || undefined
                });
            }
            if (ed.author_name) {
                embed.setAuthor({
                    name: safeFormat(ed.author_name, placeholders),
                    iconURL: safeFormat(ed.author_icon, placeholders) || undefined
                });
            }
            if (ed.thumbnail) embed.setThumbnail(safeFormat(ed.thumbnail, placeholders));
            if (ed.image) embed.setImage(safeFormat(ed.image, placeholders));

            const content = ed.message ? safeFormat(ed.message, placeholders) : undefined;
            sent = await welcomeChannel.send({ content, embeds: [embed] }).catch(() => null);
        }

        if (sent && config.autoDelete) {
            setTimeout(() => sent.delete().catch(() => {}), config.autoDelete * 1000);
        }
    });
};
