const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ButtonBuilder,
    SeparatorSpacingSize,
    ButtonStyle,
    MessageFlags,
} = require("discord.js");

const ENABLED_EMOJI  = "<:ratio_enabled2:1428490622892769411>";
const DISABLED_EMOJI = "<:ratio_disabled2:1428491487016124623>";

const ANTINUKE_MODULES = [
    { name: "Anti Channel Create",    key: "channelCreate" },
    { name: "Anti Channel Delete",    key: "channelDelete" },
    { name: "Anti Channel Update",    key: "channelUpdate" },
    { name: "Anti Role Create",       key: "roleCreate" },
    { name: "Anti Role Delete",       key: "roleDelete" },
    { name: "Anti Role Update",       key: "roleUpdate" },
    { name: "Anti Webhook Create",    key: "webhookCreate" },
    { name: "Anti Webhook Delete",    key: "webhookDelete" },
    { name: "Anti Webhook Update",    key: "webhookUpdate" },
    { name: "Anti Guild Update",      key: "guildUpdate" },
    { name: "Anti Integration Add",   key: "integrationAdd" },
    { name: "Anti Integration Update",key: "integrationUpdate" },
    { name: "Anti Integration Delete",key: "integrationDelete" },
    { name: "Anti Ban",               key: "ban" },
    { name: "Anti Kick",              key: "kick" },
    { name: "Anti Unban",             key: "unban" },
    { name: "Anti Bot Add",           key: "botAdd" },
    { name: "Anti Everyone Ping",     key: "everyonePing" },
    { name: "Anti Here Ping",         key: "herePing" },
    { name: "Anti Member Role Update",key: "memberRoleUpdate" },
    { name: "Anti Community Channel", key: "communityChannel" },
    { name: "Anti Linked Role",       key: "linkedRole" },
    { name: "Anti Member Prune",      key: "memberPrune" },
];

module.exports = {
    name: "antinuke",
    aliases: ["an"],
    description: "Enable or disable server antinuke protection",
    category: "antinuke",
    cooldown: 3,

    run: async (client, message, args, prefix) => {
        if (!client.config.owner.includes(message.author.id) &&
            message.guild.ownerId !== message.author.id) {
            return message.channel.send({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF0000)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `${client.emoji.cross} Only the **Server Owner** can use this command.`
                            )
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const sub     = args[0]?.toLowerCase();
        const guildId = message.guild.id;
        const key     = `antinuke_${guildId}`;
        const isEnabled = client.lmdbGet(key) === "enabled";

        const sep  = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
        const thin = () => new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small);

        if (!sub) {
            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0x26272F)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## ⚙️ Antinuke System")
                        )
                        .addSeparatorComponents(sep())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `\`${prefix}antinuke enable\` — Enable protection\n` +
                                `\`${prefix}antinuke disable\` — Disable protection\n` +
                                `\`${prefix}antinuke status\` — View current status`
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

        if (sub === "status") {
            const whitelist = client.lmdbGet(`whitelist_${guildId}`) || [];

            let currentPage = "status";

            const buildStatus = () =>
                new ContainerBuilder()
                    .setAccentColor(isEnabled ? 0x57F287 : 0xFF0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## 🛡️ ${message.guild.name} — Security Status`
                        )
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**Protection** : ${isEnabled ? `${ENABLED_EMOJI} Active` : `${DISABLED_EMOJI} Inactive`}\n` +
                            `**Level** : ${isEnabled ? "`Maximum`" : "`None`"}\n` +
                            `**Whitelisted Users** : \`${whitelist.length}\``
                        )
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            isEnabled
                                ? `${ENABLED_EMOJI} Your server is fully protected.`
                                : `${DISABLED_EMOJI} Server security is currently disabled.`
                        )
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# Server ID: ${guildId}`)
                    )
                    .addActionRowComponents((row) =>
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId("an_features")
                                .setLabel("View Modules")
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji("⚡")
                        )
                    );

            const buildFeatures = () =>
                new ContainerBuilder()
                    .setAccentColor(isEnabled ? 0x57F287 : 0xFF0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## ⚡ Protection Modules")
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            ANTINUKE_MODULES.map(m =>
                                `${isEnabled ? ENABLED_EMOJI : DISABLED_EMOJI} ${m.name}`
                            ).join("\n")
                        )
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            isEnabled
                                ? `-# All modules are active and protecting your server`
                                : `-# Enable antinuke to activate all modules`
                        )
                    )
                    .addActionRowComponents((row) =>
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId("an_back")
                                .setLabel("Back")
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji("<:ratio_back:1461828256335659079>")
                        )
                    );

            const buildExpiredStatus = () =>
                new ContainerBuilder()
                    .setAccentColor(0x26272F)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## 🛡️ ${message.guild.name} — Security Status`
                        )
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**Protection** : ${isEnabled ? `${ENABLED_EMOJI} Active` : `${DISABLED_EMOJI} Inactive`}\n` +
                            `**Level** : ${isEnabled ? "`Maximum`" : "`None`"}\n` +
                            `**Whitelisted Users** : \`${whitelist.length}\``
                        )
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            isEnabled
                                ? `${ENABLED_EMOJI} Your server is fully protected.`
                                : `${DISABLED_EMOJI} Server security is currently disabled.`
                        )
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# Server ID: ${guildId}`)
                    )
                    .addActionRowComponents((row) =>
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId("an_features_disabled")
                                .setLabel("View Modules")
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji("⚡")
                                .setDisabled(true)
                        )
                    );

            const buildExpiredFeatures = () =>
                new ContainerBuilder()
                    .setAccentColor(0x26272F)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## ⚡ Protection Modules")
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            ANTINUKE_MODULES.map(m =>
                                `${isEnabled ? ENABLED_EMOJI : DISABLED_EMOJI} ${m.name}`
                            ).join("\n")
                        )
                    )
                    .addSeparatorComponents(sep())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            isEnabled
                                ? `-# All modules are active and protecting your server`
                                : `-# Enable antinuke to activate all modules`
                        )
                    )
                    .addActionRowComponents((row) =>
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId("an_back_disabled")
                                .setLabel("Back")
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji("<:ratio_back:1461828256335659079>")
                                .setDisabled(true)
                        )
                    );

            const sent = await message.reply({
                components: [buildStatus()],
                flags: MessageFlags.IsComponentsV2,
            });

            const collector = sent.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 120000,
            });

            collector.on("collect", async (i) => {
                if (i.customId === "an_features") {
                    currentPage = "features";
                    return i.update({ components: [buildFeatures()], flags: MessageFlags.IsComponentsV2 });
                }
                if (i.customId === "an_back") {
                    currentPage = "status";
                    return i.update({ components: [buildStatus()], flags: MessageFlags.IsComponentsV2 });
                }
            });

            collector.on("end", async () => {
                const expired = currentPage === "features" ? buildExpiredFeatures() : buildExpiredStatus();
                await sent.edit({ components: [expired], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            });

            return;
        }

        if (sub === "enable") {
            if (isEnabled) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x26272F)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `${ENABLED_EMOJI} Antinuke is already **enabled** for this server.`
                                )
                            ),
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            client.lmdbSet(key, "enabled");
            if (!client._antinukeCache) client._antinukeCache = new Map();
            client._antinukeCache.set(guildId, true);

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0x57F287)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `${ENABLED_EMOJI} Antinuke has been **enabled** successfully.\n-# Your server is now fully protected.`
                            )
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        if (sub === "disable") {
            if (!isEnabled) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x26272F)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `${DISABLED_EMOJI} Antinuke is already **disabled** for this server.`
                                )
                            ),
                    ],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            client.lmdbDel(key);
            if (!client._antinukeCache) client._antinukeCache = new Map();
            client._antinukeCache.set(guildId, false);

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF0000)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `${DISABLED_EMOJI} Antinuke has been **disabled** successfully.\n-# Your server is no longer protected.`
                            )
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        return message.reply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0x26272F)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `${client.emoji.cross} Invalid option. Use \`${prefix}antinuke <enable|disable|status>\``
                        )
                    ),
            ],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};