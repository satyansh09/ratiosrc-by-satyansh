const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    SeparatorSpacingSize,
    ButtonStyle,
    MessageFlags,
} = require("discord.js");

module.exports = {
    name: "whitelist",
    aliases: ["wl"],
    description: "Manage antinuke whitelisted users",
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

        const guildId   = message.guild.id;
        const key       = `whitelist_${guildId}`;
        let   whitelist = client.lmdbGet(key) || [];

        const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

        const opt = args[0]?.toLowerCase();

        if (!opt) {
            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0x26272F)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## 🛡️ Whitelist Manager")
                        )
                        .addSeparatorComponents(sep())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `\`${prefix}whitelist add <user>\` — Add a user\n` +
                                `\`${prefix}whitelist remove <user>\` — Remove a user\n` +
                                `\`${prefix}whitelist show\` — View all whitelisted users\n` +
                                `\`${prefix}whitelist reset\` — Clear the whitelist`
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

        if (opt === "show") {
            let users = [];
            for (const id of whitelist) {
                const u = await client.users.fetch(id).catch(() => null);
                if (u) users.push(u);
            }

            if (users.length === 0) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x26272F)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "## 🛡️ Whitelisted Users\n\nNo users are currently whitelisted."
                                )
                            ),
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            const pageSize = 10;
            let page = 0;
            const total = Math.ceil(users.length / pageSize);

            const buildPage = () => {
                const start = page * pageSize;
                const list  = users.slice(start, start + pageSize);
                return new ContainerBuilder()
                    .setAccentColor(0x26272F)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## 🛡️ Whitelisted Users — ${users.length}`)
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            list.map((u, i) =>
                                `\`${start + i + 1}.\` **${u.tag}** — \`${u.id}\``
                            ).join("\n")
                        )
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# Page ${page + 1}/${total}`)
                    )
                    .addActionRowComponents((row) =>
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId("wl_prev")
                                .setLabel("Previous")
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(page === 0),
                            new ButtonBuilder()
                                .setCustomId("wl_next")
                                .setLabel("Next")
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(page === total - 1),
                            new ButtonBuilder()
                                .setCustomId("wl_close")
                                .setLabel("Close")
                                .setStyle(ButtonStyle.Danger)
                        )
                    );
            };

            const sent = await message.reply({
                components: [buildPage()],
                flags: MessageFlags.IsComponentsV2,
            });

            const collector = sent.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 300000,
            });

            collector.on("collect", async (i) => {
                if (i.customId === "wl_prev") page = Math.max(0, page - 1);
                if (i.customId === "wl_next") page = Math.min(total - 1, page + 1);
                if (i.customId === "wl_close") {
                    await i.message.delete().catch(() => {});
                    return collector.stop();
                }
                await i.update({ components: [buildPage()], flags: MessageFlags.IsComponentsV2 });
            });

            return;
        }

        if (opt === "add") {
            let userId   = args[1];
            const mentioned = message.mentions.users.first();
            if (mentioned) userId = mentioned.id;

            if (!userId) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x26272F)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `${client.emoji.cross} Please provide a user mention or ID.`
                                )
                            ),
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF0000)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`${client.emoji.cross} Invalid user ID.`)
                            ),
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            if (whitelist.includes(user.id)) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x26272F)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `${client.emoji.cross} **${user.tag}** is already whitelisted.`
                                )
                            ),
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            whitelist.push(user.id);
            client.lmdbSet(key, whitelist);
            if (!client._whitelistCache) client._whitelistCache = new Map();
            if (!client._whitelistCache.has(guildId)) client._whitelistCache.set(guildId, new Set());
            client._whitelistCache.get(guildId).add(user.id);

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0x57F287)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `<:ratio_enabled2:1428490622892769411> **${user.tag}** has been added to the whitelist.\n-# ID: \`${user.id}\``
                            )
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        if (opt === "remove") {
            let userId      = args[1];
            const mentioned = message.mentions.users.first();
            if (mentioned) userId = mentioned.id;

            if (!userId) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x26272F)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `${client.emoji.cross} Please provide a user mention or ID.`
                                )
                            ),
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF0000)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`${client.emoji.cross} Invalid user ID.`)
                            ),
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            if (!whitelist.includes(user.id)) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x26272F)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `${client.emoji.cross} **${user.tag}** is not in the whitelist.`
                                )
                            ),
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            whitelist = whitelist.filter(x => x !== user.id);
            client.lmdbSet(key, whitelist);
            if (!client._whitelistCache) client._whitelistCache = new Map();
            if (client._whitelistCache.has(guildId)) client._whitelistCache.get(guildId).delete(user.id);

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF0000)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `<:ratio_disabled2:1428491487016124623> **${user.tag}** has been removed from the whitelist.\n-# ID: \`${user.id}\``
                            )
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        if (opt === "reset") {
            if (whitelist.length === 0) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x26272F)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `${client.emoji.cross} Whitelist is already empty.`
                                )
                            ),
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            const buildConfirm = () =>
                new ContainerBuilder()
                    .setAccentColor(0xFF0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## ⚠️ Confirm Reset")
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `This will remove **${whitelist.length}** users from the whitelist.\nThis action cannot be undone.`
                        )
                    )
                    .addSeparatorComponents(sep())
                    .addActionRowComponents((row) =>
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId("wl_confirm")
                                .setLabel("Confirm Reset")
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId("wl_cancel")
                                .setLabel("Cancel")
                                .setStyle(ButtonStyle.Secondary)
                        )
                    );

            const confirmMsg = await message.reply({
                components: [buildConfirm()],
                flags: MessageFlags.IsComponentsV2,
            });

            const collector = confirmMsg.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 30000,
                max: 1,
            });

            collector.on("collect", async (i) => {
                if (i.customId === "wl_confirm") {
                    const count = whitelist.length;
                    client.lmdbSet(key, []);
                    if (!client._whitelistCache) client._whitelistCache = new Map();
                    client._whitelistCache.set(guildId, new Set());

                    return i.update({
                        components: [
                            new ContainerBuilder()
                                .setAccentColor(0xFF0000)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        `<:ratio_disabled2:1428491487016124623> Whitelist has been reset.\n-# Removed \`${count}\` users.`
                                    )
                                ),
                        ],
                        flags: MessageFlags.IsComponentsV2,
                    });
                }

                if (i.customId === "wl_cancel") {
                    return i.update({
                        components: [
                            new ContainerBuilder()
                                .setAccentColor(0x26272F)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent("Reset cancelled.")
                                ),
                        ],
                        flags: MessageFlags.IsComponentsV2,
                    });
                }
            });

            collector.on("end", async (collected) => {
                if (collected.size === 0) {
                    await confirmMsg.edit({
                        components: [
                            new ContainerBuilder()
                                .setAccentColor(0x26272F)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent("Reset timed out.")
                                ),
                        ],
                        flags: MessageFlags.IsComponentsV2,
                    }).catch(() => {});
                }
            });

            return;
        }
    },
};