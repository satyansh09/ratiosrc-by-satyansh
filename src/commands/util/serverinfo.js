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
    name: "serverinfo",
    aliases: ["si"],
    cat: "util",

    run: async (client, message) => {
        const guild = message.guild;
        const owner = await guild.fetchOwner().catch(() => null);

        const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

        const boostUpload = { 0: "8 MB", 1: "8 MB", 2: "50 MB", 3: "100 MB" };

        const roles = guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .filter(r => r.id !== guild.id)
            .map(r => `<@&${r.id}>`);

        const rolesDisplay = roles.length === 0 ? "None" : roles.join(", ");

        const buildMain = () =>
            new ContainerBuilder()
                .setAccentColor(0x26272F)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${guild.name}`)
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**General**\n` +
                        `ID : \`${guild.id}\`\n` +
                        `Owner : ${owner ? owner.user.tag : "Unknown"}\n` +
                        `Mention : ${owner ? `<@${owner.user.id}>` : "Unknown"}\n` +
                        `Members : \`${guild.memberCount}\`\n` +
                        `Created : <t:${Math.round(guild.createdTimestamp / 1000)}:F>`
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Boost**\n` +
                        `Level : \`${guild.premiumTier}\`\n` +
                        `Total Boosts : \`${guild.premiumSubscriptionCount}\`\n` +
                        `Upload Limit : \`${boostUpload[guild.premiumTier] ?? "8 MB"}\``
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Requested by ${message.author.tag}`)
                )
                .addActionRowComponents((row) =>
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId("si_roles")
                            .setLabel("Roles")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId("si_avatar")
                            .setLabel("Server Avatar")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId("si_banner")
                            .setLabel("Server Banner")
                            .setStyle(ButtonStyle.Secondary)
                    )
                );

        const buildRoles = () =>
            new ContainerBuilder()
                .setAccentColor(0x26272F)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${guild.name} — Roles [${roles.length}]`)
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(rolesDisplay)
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Requested by ${message.author.tag}`)
                )
                .addActionRowComponents((row) =>
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId("si_back")
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Secondary)
                    )
                );

        const buildAvatar = () => {
            const iconURL = guild.iconURL({ size: 1024, extension: "png" });
            return new ContainerBuilder()
                .setAccentColor(0x26272F)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${guild.name} — Server Avatar`)
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        iconURL ? `[Open Full Size](${iconURL})` : "This server has no avatar."
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Requested by ${message.author.tag}`)
                )
                .addActionRowComponents((row) =>
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId("si_back")
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Secondary)
                    )
                );
        };

        const buildBanner = () => {
            const bannerURL = guild.bannerURL({ size: 1024, extension: "png" });
            return new ContainerBuilder()
                .setAccentColor(0x26272F)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${guild.name} — Server Banner`)
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        bannerURL ? `[Open Full Size](${bannerURL})` : "This server has no banner."
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Requested by ${message.author.tag}`)
                )
                .addActionRowComponents((row) =>
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId("si_back")
                            .setLabel("Back")
                            .setStyle(ButtonStyle.Secondary)
                    )
                );
        };

        const msg = await message.channel.send({
            components: [buildMain()],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { roles: [] },
        });

        const collector = msg.createMessageComponentCollector({ time: 300000 });

        collector.on("collect", async (i) => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: "Only the command author can use these buttons.", ephemeral: true });
            }

            if (i.customId === "si_roles") {
                return i.update({
                    components: [buildRoles()],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { roles: [] },
                });
            }
            if (i.customId === "si_avatar") {
                return i.update({ components: [buildAvatar()], flags: MessageFlags.IsComponentsV2 });
            }
            if (i.customId === "si_banner") {
                return i.update({ components: [buildBanner()], flags: MessageFlags.IsComponentsV2 });
            }
            if (i.customId === "si_back") {
                return i.update({
                    components: [buildMain()],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { roles: [] },
                });
            }
        });
    },
};