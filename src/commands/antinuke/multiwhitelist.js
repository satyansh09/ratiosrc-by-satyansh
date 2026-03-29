const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require("discord.js");

module.exports = {
    name: "multiwhitelist",
    aliases: ["multiwl", "mwl"],
    description: "Add or remove multiple users from whitelist at once",
    category: "antinuke",
    cooldown: 3,

    run: async (client, message, args, prefix) => {
        const owners      = client.config?.owner || [];
        const extra1      = await client.db.get(`ownerPermit1_${message.guild.id}`);
        const extra2      = await client.db.get(`ownerPermit2_${message.guild.id}`);
        const extraOwners = [extra1, extra2].filter(Boolean);

        if (
            message.author.id !== message.guild.ownerId &&
            !owners.includes(message.author.id) &&
            !extraOwners.includes(message.author.id)
        ) {
            return message.channel.send({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF0000)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `${client.emoji.cross} Only the **server owner** can use this command.`
                            )
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const key       = `whitelist_${message.guild.id}`;
        let   whitelist = client.lmdbGet(key) || [];

        const opt = args[0]?.toLowerCase();

        const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

        if (!opt || !["add", "remove"].includes(opt)) {
            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0x26272F)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## 🛡️ Multi Whitelist")
                        )
                        .addSeparatorComponents(sep())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `\`${prefix}multiwhitelist add <@users...>\` — Add multiple users\n` +
                                `\`${prefix}multiwhitelist remove <@users...>\` — Remove multiple users`
                            )
                        )
                        .addSeparatorComponents(sep())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# Requested by ${message.author.tag}`)
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        let users = message.mentions.members.map(m => m);
        if (users.length === 0) {
            users = args.slice(1)
                .map(id => message.guild.members.cache.get(id))
                .filter(Boolean);
        }

        if (users.length === 0) {
            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0x26272F)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `${client.emoji.cross} No valid users provided.`
                            )
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        if (opt === "add") {
            const added   = [];
            const skipped = [];

            for (const user of users) {
                if (!whitelist.includes(user.id)) {
                    whitelist.push(user.id);
                    added.push(user.user.tag);
                } else {
                    skipped.push(user.user.tag);
                }
            }

            client.lmdbSet(key, whitelist);
            if (client.updateWhitelistCache) {
                for (const user of users) client.updateWhitelistCache(message.guild.id, user.id, true);
            }

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0x57F287)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## <:ratio_enabled2:1428490622892769411> Whitelist Updated")
                        )
                        .addSeparatorComponents(sep())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `**Added [${added.length}]**\n${added.length ? added.map(t => `\`${t}\``).join(", ") : "None"}\n\n` +
                                `**Already Whitelisted [${skipped.length}]**\n${skipped.length ? skipped.map(t => `\`${t}\``).join(", ") : "None"}`
                            )
                        )
                        .addSeparatorComponents(sep())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# Requested by ${message.author.tag}`)
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        if (opt === "remove") {
            const removed  = [];
            const notFound = [];

            for (const user of users) {
                if (whitelist.includes(user.id)) {
                    whitelist = whitelist.filter(x => x !== user.id);
                    removed.push(user.user.tag);
                } else {
                    notFound.push(user.user.tag);
                }
            }

            client.lmdbSet(key, whitelist);
            if (client.updateWhitelistCache) {
                for (const user of users) client.updateWhitelistCache(message.guild.id, user.id, false);
            }

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF0000)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## <:ratio_disabled2:1428491487016124623> Whitelist Updated")
                        )
                        .addSeparatorComponents(sep())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `**Removed [${removed.length}]**\n${removed.length ? removed.map(t => `\`${t}\``).join(", ") : "None"}\n\n` +
                                `**Not Found [${notFound.length}]**\n${notFound.length ? notFound.map(t => `\`${t}\``).join(", ") : "None"}`
                            )
                        )
                        .addSeparatorComponents(sep())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# Requested by ${message.author.tag}`)
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};